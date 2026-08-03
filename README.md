# Fitness Park Offenbach — Website

Statische Website. Kein Build-Schritt, keine Abhängigkeiten — die Dateien lassen
sich direkt auf jeden Webspace laden.

## Lokal ansehen

```bash
python3 -m http.server 8777
# → http://localhost:8777
```

## Struktur

```
index.html            Startseite
impressum.html        Impressum
datenschutz.html      Datenschutzerklärung
assets/css/styles.css Alle Styles, Design-Tokens ganz oben in :root
assets/js/main.js     Navigation, Longevity-Tabs, Formularvalidierung, Reveals
assets/img/           Aus den Originallogos zugeschnitten + Favicons
assets/img/fotos/     Bearbeitete Studiofotos, WebP und JPEG in mehreren Größen
tools/grade.py        Bildbearbeitung: Weißabgleich, Kontrast, Farbsteuerung
deploy.sh             Upload auf den IONOS-Webspace
F9 Website/           Original-Logodateien (unverändert)
f9 Fotos/             Original-Studiofotos (unverändert)
```

## Design

Helles Theme: warmes Weiß als Grundfläche, Schwarz für Text, Rot als einzige
Akzentfarbe. Der Abschluss-CTA ist eine vollflächig rote Bahn und dient als
Gegengewicht zur hellen Seite.

| Token | Wert | Verwendung |
|---|---|---|
| `--red` | `#E61515` | Markenrot aus dem Logo — Flächen, Grafik, große Schrift |
| `--red-cta` | `#D81212` | Button-Füllung, trägt weiße Schrift mit 5,3:1 |
| `--red-txt` | `#C81010` | Kleine Schrift auf Hell mit 5,9:1 |
| `--red-tint` | `#FBF0EE` | Zarte rote Bandflächen (Longevity, Kontakt) |
| `--paper` | `#FAF9F7` | Seitenhintergrund |
| `--card` | `#FFFFFF` | Karten, Formular, Hero |
| `--ink` | `#0D0D0E` | Text |
| `--amber` | `#B25A00` | Nur Warnungen und Platzhalter, bewusst nicht Rot |

**Warum drei Rottöne:** Das Logo-Rot `#E61515` erreicht auf Weiß nur 4,25:1 und
fällt damit für kleine Schrift unter die WCAG-AA-Grenze. Für Fließtextgrößen wird
deshalb `--red-txt` verwendet, für weiße Schrift auf rotem Grund `--red-cta`.
Optisch sind die drei kaum unterscheidbar, technisch bestehen alle Kombinationen
die Kontrastprüfung.

Logo-Einsatz: `logo-lockup-light.png` (schwarze Schrift) in Navigation und
Footer, `logo-mark.png` als Wasserzeichen und Favicon. Für dunkle Flächen liegt
`logo-lockup-dark.png` (weiße Schrift) bereit.

Schriften: **Archivo** (Überschriften, passend zur Wortmarke) und
**Instrument Sans** (Fließtext), beide über Google Fonts.

## Fotos

Die Originalaufnahmen in `f9 Fotos/` haben einen kräftigen Gelbstich und wenig
Tiefe. `tools/grade.py` bringt sie auf den Stil der Website:

- **Weißabgleich** — Blau leicht angehoben, Rot minimal zurück. Nimmt den
  Gelbstich, ohne die roten Geräte auszubluten
- **S-Kurve** — Tiefen runter, Lichter rauf. Gibt den flauen Aufnahmen Kontrast
- **Farbsteuerung nach Farbton** — Rot bleibt voll gesättigt, Gelb und Grün
  werden deutlich beruhigt. Sonst kämpft etwa die grüne Wand im Saunabereich
  gegen das Markenrot
- **Nachschärfen** nach dem Verkleinern

Neue Fotos in `f9 Fotos/` legen, in der Tabelle `PLAN` am Ende des Skripts
eintragen (Dateiname → Name auf der Website → Verwendung), dann:

```bash
python3 tools/grade.py
```

Ausgegeben werden WebP und JPEG in mehreren Breiten. Im Markup liefert
`<picture>` beides aus, der Browser wählt selbst.

Einsatzorte: Trainingsfläche im Hero, vier Fotos am Fuß der Bento-Kacheln
(Kraftbereich, Cardio, Longevity, Sauna), Umkleide bei „Über uns" und die
Sonnenterrasse als vollflächiges Band vor dem Abschluss-CTA.

## Vor dem Livegang zu erledigen

### 1. Platzhalter ersetzen

Alle offenen Stellen sind im Quelltext mit `class="tbd"` markiert und erscheinen
im Browser als orange gestrichelte Felder. So findest du sie alle:

```bash
grep -rn 'class="tbd"' *.html
```

Zu ergänzen:

- **Impressum**: Registergericht, HRB-Nummer, USt-IdNr., redaktionell
  verantwortliche Person
- **Datenschutz**: Hosting-Anbieter, Datum des Stands

Bereits eingetragen: Adresse Rowentastraße 9, 63071 Offenbach am Main ·
Telefon 069 818424 (als `tel:`-Link) · Öffnungszeiten Mo–Fr 07:00–23:00,
Sa + So 08:00–20:00 · E-Mail info@fitness-park-offenbach.com · alle
Monatsbeiträge und Gebühren · Kursplan mit dem Hinweis, dass alle Kurse ohne
Aufpreis und ohne Anmeldung im Beitrag enthalten sind · Leistungsumfang der
Mitgliedschaft (Fläche, Kurse, Einweisung, Sauna und Sonnenterrasse — alles in
jeder Laufzeit enthalten) · beide Gebühren als einmalig ausgewiesen, die
milon-Gebühr nur bei Nutzung des Zirkels. Adresse, Telefon,
Öffnungszeiten und das Gründungsjahr stehen zusätzlich maschinenlesbar im
JSON-LD-Block von `index.html`, damit Google sie für den Brancheneintrag und
die lokale Suche auslesen kann.

### Kursplan pflegen

Der Plan wird an **einer** Stelle gepflegt: der Liste `#scheduleList` in
`index.html`. Pro Wochentag ein `<div class="day" data-day="1">` (0 = Sonntag)
mit `<li class="course">`-Einträgen:

```html
<li class="course" data-start="18:30" data-end="19:30" data-cat="cardio">
  <span class="course__time">18:30 – 19:30</span>
  <span class="course__name">Spinning</span>
</li>
```

Aus dieser Liste baut `main.js` beim Laden das Zeitraster auf — Position und
Höhe im Kalender ergeben sich aus `data-start` und `data-end`. Die sichtbare
Zeit in `.course__time` bitte gleich mitpflegen, sie wird unverändert angezeigt.

`data-cat` steuert die Filter: `kraft`, `cardio`, `ruecken`, `yoga`. Die Zahlen
in den Filter-Chips stehen fest im Markup und müssen bei Änderungen mit
angepasst werden.

Ohne JavaScript und auf Bildschirmen unter 900 px erscheint statt des Rasters
die Liste — beide zeigen dieselben Daten und reagieren auf dieselben Filter.

Die Zeitbänder des Kalenders (09–13 Uhr und 17–21 Uhr) sind in `main.js` als
`BANDS` definiert. Fällt künftig ein Kurs außerhalb dieser Zeiten an, muss das
Band dort erweitert werden.

### Preise pflegen

Die Beiträge stehen direkt im Markup von `index.html` im Block `.pricing` —
eine Liste `.rates` mit einer Zeile je Laufzeit, daneben eine `.side-box` für
die Gebühren. Beim Ändern eines Preises reicht es,
die Zahl in der jeweiligen Zeile zu ersetzen. Die Klasse `rate--best` markiert
die hervorgehobene Zeile inklusive Badge.

### 2. Formularversand: Übergangslösung ersetzen

Das Kontaktformular validiert vollständig und öffnet nach dem Absenden eine
vorbereitete E-Mail an `info@fitness-park-offenbach.com` im Mailprogramm des
Besuchers. Das funktioniert ohne Server, hat aber zwei Schwächen: auf Geräten
ohne eingerichtetes Mailprogramm passiert nichts, und die Anfrage geht erst
raus, wenn der Besucher im Mailprogramm ein zweites Mal auf Senden klickt.

Für den Livebetrieb besser durch einen echten Endpunkt ersetzen — der Block
steht in `assets/js/main.js` und ist entsprechend kommentiert:

- Ein Dienst wie Formspree oder FormSubmit: `action`-Attribut am `<form>` setzen
  und den `preventDefault()`-Aufruf entfernen.
- Ein eigenes PHP-Skript auf dem Webspace, per `fetch()` angesprochen.

### 3. Inhalte prüfen

Die Texte beschreiben das Studio anhand deiner Angaben (über 2.000 m²,
Geräteauswahl für jedes Alter, Longevity-Fokus mit milon-Zirkel und Dehnzirkel,
Sauna mit Ruheraum und Sonnenterrasse, Kursraum über 100 m²). Die
Beschreibungen der acht Bereiche sind ein **Vorschlag** — bitte gegen die
Realität im Studio abgleichen und korrigieren.

Auch die Kurskategorien (`data-cat`) sind meine Zuordnung: „Body in Motion" habe
ich unter Rücken & Mobility einsortiert, „Jumping Tabata" unter Cardio. Wer die
Kurse gibt, weiß es besser — bitte einmal durchsehen.

Die Longevity-Übersicht nach Jahrzehnten (`DECADES` in `main.js`) enthält
allgemeine Trainingsempfehlungen. Sie ist bewusst mit einem Hinweis versehen,
dass sie keine ärztliche Beratung ersetzt.

### 4. Rechtstexte prüfen lassen

Impressum und Datenschutzerklärung sind Entwürfe auf Basis der üblichen
Pflichtangaben, **keine Rechtsberatung**. Vor Veröffentlichung fachkundig prüfen
lassen — ein fehlerhaftes Impressum ist abmahnfähig.

### 5. Optional: Google Fonts lokal hosten

Aktuell werden die Schriften von Google geladen, wodurch die IP-Adressen der
Besucher an Google übertragen werden. Lädt man die Schriftdateien auf den eigenen
Server, entfällt das — und der entsprechende Abschnitt in der
Datenschutzerklärung kann gestrichen werden.

## Barrierefreiheit

Berücksichtigt: Skip-Link, sichtbare Fokusringe, Tastaturbedienung der
Longevity-Tabs (Pfeiltasten, Home/End), Fehlermeldungen direkt am Feld mit
automatischem Fokus auf das erste fehlerhafte Feld, Touch-Ziele ab 48 px,
`prefers-reduced-motion` schaltet alle Animationen ab, Kontraste nach WCAG AA
geprüft.
