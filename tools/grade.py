#!/usr/bin/env python3
"""
Bildbearbeitung für die Website des Fitness Park Offenbach.

Die Originalaufnahmen haben einen kräftigen Gelbstich und wenig Tiefe.
Diese Routine bringt sie auf den Stil der Website: neutrale Weißtöne,
klare Schwärzen, zurückgenommene Nebenfarben — und ein Rot, das stehen
bleibt, weil es die Markenfarbe ist.

Aufruf:  python3 tools/grade.py
"""

import os
import glob
import unicodedata
from PIL import Image, ImageEnhance, ImageFilter, ImageChops

QUELLE = "f9 Fotos"
ZIEL = "assets/img/fotos"

# Ausgabebreiten je Verwendung
BREITEN = {
    "hero": [1800, 1200, 800],
    "streifen": [900, 600],
}


# ---------------------------------------------------------------- Weißabgleich
def kuehlen(im, rot=0.975, gruen=0.995, blau=1.055):
    """Nimmt den Gelbstich zurück, ohne die Rottöne auszubluten."""
    r, g, b = im.split()
    r = r.point(lambda v: min(255, int(v * rot)))
    g = g.point(lambda v: min(255, int(v * gruen)))
    b = b.point(lambda v: min(255, int(v * blau)))
    return Image.merge("RGB", (r, g, b))


# ------------------------------------------------------------------- Tonwerte
def s_kurve(im, staerke=0.07, schwarzpunkt=1, lift=0.10, gamma=0.90):
    """
    Sehr zurückhaltende Kontrastkurve mit deutlicher Aufhellung.

    Die Studioaufnahmen sollen freundlich und offen wirken, nicht
    dramatisch. Deshalb wenig S-Kurve, dafür ein Gamma unter 1 (hebt die
    Mitteltöne) und ein leichter Lift, der die Tiefen aufmacht.
    """
    lut = []
    for v in range(256):
        x = max(0.0, (v - schwarzpunkt) / (255.0 - schwarzpunkt))
        s = x * x * (3 - 2 * x)
        y = x + (s - x) * staerke
        y = y ** gamma                 # Mitteltöne anheben
        y = lift / 255.0 + y * (1 - lift / 255.0)
        lut.append(max(0, min(255, int(y * 255))))
    return im.point(lut * 3)


# ------------------------------------------------- Farbe: Rot halten, Rest ruhig
def hue_maske(staerke_rot=255, staerke_gruen=118, staerke_rest=186):
    """
    Nachschlagetabelle über den Farbton (0=Rot, 85=Grün, 170=Blau).
    Rot bleibt voll gesättigt, Grün und Gelb werden deutlich beruhigt —
    sonst kämpft die grüne Wand im Saunabereich gegen das Markenrot.
    """
    lut = []
    for h in range(256):
        # Abstand zum Rotpunkt, zyklisch über 256
        d_rot = min(h, 256 - h)
        # Abstand zum Gelb-Grün-Bereich (Mitte etwa 55)
        d_gruen = abs(h - 58)

        if d_rot <= 14:
            v = staerke_rot
        elif d_rot <= 34:
            t = (d_rot - 14) / 20.0
            v = staerke_rot + (staerke_rest - staerke_rot) * t
        elif d_gruen <= 34:
            v = staerke_gruen
        elif d_gruen <= 60:
            t = (d_gruen - 34) / 26.0
            v = staerke_gruen + (staerke_rest - staerke_gruen) * t
        else:
            v = staerke_rest
        lut.append(int(v))
    return lut


MASKE = hue_maske()


def farbe_lenken(im):
    """Sättigung farbtonabhängig steuern."""
    hsv = im.convert("HSV")
    h, s, v = hsv.split()
    faktor = h.point(MASKE)
    s = ImageChops.multiply(s, faktor)
    return Image.merge("HSV", (h, s, v)).convert("RGB")


# ------------------------------------------------------------------ Gesamtlauf
def zuschneiden(im, box):
    """Relativer Ausschnitt (links, oben, rechts, unten) je 0…1."""
    b, h = im.size
    return im.crop((round(box[0] * b), round(box[1] * h),
                    round(box[2] * b), round(box[3] * h)))


def bearbeiten(im, ausschnitt=None):
    im = im.convert("RGB")
    if ausschnitt:
        im = zuschneiden(im, ausschnitt)
    im = kuehlen(im)
    im = s_kurve(im)
    im = farbe_lenken(im)
    im = ImageEnhance.Contrast(im).enhance(1.02)
    im = ImageEnhance.Brightness(im).enhance(1.09)
    return im


def speichern(im, basis, breiten):
    """Speichert je Breite eine WebP- und eine JPEG-Fassung."""
    ergebnis = []
    for b in breiten:
        if im.width <= b:
            k = im.copy()
        else:
            k = im.resize((b, round(im.height * b / im.width)), Image.LANCZOS)
        # Nach dem Verkleinern nachschärfen, sonst wirkt es weich
        k = k.filter(ImageFilter.UnsharpMask(radius=1.0, percent=68, threshold=3))

        webp = f"{ZIEL}/{basis}-{b}.webp"
        jpg = f"{ZIEL}/{basis}-{b}.jpg"
        k.save(webp, "WEBP", quality=80, method=6)
        k.save(jpg, "JPEG", quality=82, optimize=True, progressive=True)
        ergebnis.append((b, k.size, os.path.getsize(webp), os.path.getsize(jpg)))
    return ergebnis


# Zuordnung Datei → Name auf der Website → Verwendungen
# Alle Fotos laufen im Bildstreifen; die Trainingsfläche zusätzlich im Hero.
# Dritter Eintrag: relativer Ausschnitt für hochkante Aufnahmen.
# Der Kursraum ist im Hochformat fotografiert — der Ausschnitt legt sich
# auf Spiegelwand und Fensterfront, der leere Boden darunter fällt weg.
PLAN = {
    "Kursraum.jpg":            ("kursraum",     ["streifen"], (0.0, 0.22, 1.0, 0.72)),
    "trainingsfläche 1..JPG":  ("kraftbereich", ["streifen"]),
    "Cardio-neu.png":          ("cardio",       ["streifen"]),
    "Milon zirkel.JPG":        ("milon",        ["streifen"]),
    "Sauna Ruheraum.png":      ("sauna",        ["streifen"]),
    "Umkleide.JPG":            ("umkleide",     ["streifen"]),
    "terasse f9.png":          ("terrasse",     ["streifen"]),
}


def main():
    os.makedirs(ZIEL, exist_ok=True)
    gesamt_webp = gesamt_jpg = 0

    # macOS legt Dateinamen in zerlegter Unicode-Form ab ("a" + Trema),
    # Python-Literale sind zusammengesetzt. Ohne Normalisierung findet
    # der Vergleich alle Dateien mit Umlaut nicht.
    plan = {unicodedata.normalize("NFC", k): v for k, v in PLAN.items()}
    gefunden = set()

    for datei in sorted(glob.glob(f"{QUELLE}/*")):
        name = unicodedata.normalize("NFC", os.path.basename(datei))
        if name not in plan:
            continue
        gefunden.add(name)
        eintrag = plan[name]
        basis, verwendungen = eintrag[0], eintrag[1]
        ausschnitt = eintrag[2] if len(eintrag) > 2 else None

        im = Image.open(datei)
        print(f"\n{name}  ({im.width}×{im.height})  →  {basis}")
        im = bearbeiten(im, ausschnitt)

        breiten = sorted({b for v in verwendungen for b in BREITEN[v]}, reverse=True)
        for b, groesse, w, j in speichern(im, basis, breiten):
            print(f"   {groesse[0]:>5}×{groesse[1]:<5}  webp {w//1024:>4} KB   jpg {j//1024:>4} KB")
            gesamt_webp += w
            gesamt_jpg += j

    fehlend = set(plan) - gefunden
    if fehlend:
        print("\nNicht gefunden: " + ", ".join(sorted(fehlend)))

    print(f"\nGesamt: WebP {gesamt_webp//1024} KB, JPEG {gesamt_jpg//1024} KB")


if __name__ == "__main__":
    main()
