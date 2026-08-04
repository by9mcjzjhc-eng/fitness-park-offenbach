#!/usr/bin/env python3
"""
Setzt aus der gerenderten Bühne und der hohen Seitenaufnahme eine
Animation zusammen: die Website scrollt im Telefonrahmen durch,
danach die rote Abschlusskarte.

Das Scrollen wird hier gerechnet statt im Browser — sonst bräuchte
jedes Einzelbild einen eigenen Browserstart und der Lauf würde Minuten
dauern statt Sekunden.

Aufruf:  python3 tools/video.py
"""

import os
import sys
from PIL import Image, ImageDraw

ARBEIT = os.environ.get("ARBEIT", ".")
ZIEL = "assets/img/video"

# Lage des Bildschirms innerhalb der Bühne (aus _buehne.html)
SCHIRM_X, SCHIRM_Y = 260, 616
SCHIRM_B, SCHIRM_H = 560, 1214
RADIUS = 50

# Dynamic Island
INSEL_B, INSEL_H, INSEL_Y = 118, 34, 30

BILDER_PRO_SEK = 12
SCROLL_SEK = 11.0
HALT_ANFANG = 0.7
HALT_ENDE = 0.5
ENDKARTE_SEK = 2.2

AUSGABE_BREITE = 540

# Einzelbildausgabe für die MP4-Kodierung:
#   python3 tools/video.py --frames <ordner> --breite 1080 --fps 30
FRAMES_ORDNER = None
for i, a in enumerate(sys.argv):
    if a == "--frames":
        FRAMES_ORDNER = sys.argv[i + 1]
    elif a == "--breite":
        AUSGABE_BREITE = int(sys.argv[i + 1])
    elif a == "--fps":
        BILDER_PRO_SEK = int(sys.argv[i + 1])


def maske_rund(groesse, radius):
    m = Image.new("L", groesse, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, groesse[0] - 1, groesse[1] - 1],
                                        radius=radius, fill=255)
    return m


def ease(x):
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def main():
    buehne = Image.open(f"{ARBEIT}/stage.png").convert("RGB")
    ende = Image.open(f"{ARBEIT}/ende.png").convert("RGB")
    seite = Image.open(f"{ARBEIT}/seite_mobil.png").convert("RGB")

    # Seitenaufnahme auf Bildschirmbreite bringen
    if seite.width != SCHIRM_B:
        neu_h = round(seite.height * SCHIRM_B / seite.width)
        seite = seite.resize((SCHIRM_B, neu_h), Image.LANCZOS)

    weg = seite.height - SCHIRM_H
    maske = maske_rund((SCHIRM_B, SCHIRM_H), RADIUS)

    insel_x = SCHIRM_X + (SCHIRM_B - INSEL_B) // 2
    insel_y = SCHIRM_Y + INSEL_Y

    bilder = []

    def bild_bei(anteil):
        y = round(weg * ease(anteil))
        rahmen = buehne.copy()
        ausschnitt = seite.crop((0, y, SCHIRM_B, y + SCHIRM_H))
        rahmen.paste(ausschnitt, (SCHIRM_X, SCHIRM_Y), maske)
        # Insel liegt über dem Bild, sonst verschwindet sie beim Einsetzen
        ImageDraw.Draw(rahmen).rounded_rectangle(
            [insel_x, insel_y, insel_x + INSEL_B, insel_y + INSEL_H],
            radius=INSEL_H // 2, fill=(0, 0, 0))
        return rahmen.resize((AUSGABE_BREITE, round(rahmen.height * AUSGABE_BREITE / rahmen.width)),
                             Image.LANCZOS)

    n_anfang = round(HALT_ANFANG * BILDER_PRO_SEK)
    n_scroll = round(SCROLL_SEK * BILDER_PRO_SEK)
    n_ende_halt = round(HALT_ENDE * BILDER_PRO_SEK)
    n_karte = round(ENDKARTE_SEK * BILDER_PRO_SEK)

    kopf = bild_bei(0.0)
    bilder += [kopf] * n_anfang
    for i in range(1, n_scroll + 1):
        bilder.append(bild_bei(i / n_scroll))
    bilder += [bilder[-1]] * n_ende_halt

    karte = ende.resize((AUSGABE_BREITE, round(ende.height * AUSGABE_BREITE / ende.width)),
                        Image.LANCZOS)
    # Kurze Überblendung in die Abschlusskarte
    for i in range(6):
        bilder.append(Image.blend(bilder[-1] if i == 0 else bilder[-1], karte, (i + 1) / 6))
    bilder += [karte] * n_karte

    sek = len(bilder) / BILDER_PRO_SEK
    print(f"{len(bilder)} Einzelbilder · {sek:.1f} s · {bilder[0].size[0]}×{bilder[0].size[1]}")

    if FRAMES_ORDNER:
        os.makedirs(FRAMES_ORDNER, exist_ok=True)
        for alt in os.listdir(FRAMES_ORDNER):
            if alt.endswith(".jpg"):
                os.remove(os.path.join(FRAMES_ORDNER, alt))
        for i, b in enumerate(bilder):
            b.save(f"{FRAMES_ORDNER}/{i:05d}.jpg", "JPEG", quality=94, subsampling=0)
        print(f"→ {len(bilder)} Bilder in {FRAMES_ORDNER}")
        return

    os.makedirs(ZIEL, exist_ok=True)
    pfad = f"{ZIEL}/f9-neuer-auftritt.webp"
    bilder[0].save(pfad, "WEBP", save_all=True, append_images=bilder[1:],
                   duration=round(1000 / BILDER_PRO_SEK), loop=0,
                   quality=68, method=4)
    print(f"{pfad} — {os.path.getsize(pfad)//1024} KB")


if __name__ == "__main__":
    main()
