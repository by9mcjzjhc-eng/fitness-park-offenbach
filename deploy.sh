#!/bin/bash
# ============================================================
# Fitness Park Offenbach — Website auf den IONOS-Webspace laden
#
# Aufruf:  ./deploy.sh
# Fragt einmal nach dem SFTP-Passwort und lädt alles hoch.
# ============================================================

set -euo pipefail

HOST="access-5021068450.webspace-host.com"
USER="su1017067"
ZIEL="public"
QUELLE="$(cd "$(dirname "$0")" && pwd)"

# --- Upload-Paket frisch bauen -------------------------------
echo "→ Upload-Paket bauen …"
rm -rf "$QUELLE/_upload"
mkdir -p "$QUELLE/_upload"
cp -R \
  "$QUELLE/index.html" \
  "$QUELLE/impressum.html" \
  "$QUELLE/datenschutz.html" \
  "$QUELLE/404.html" \
  "$QUELLE/kontakt.php" \
  "$QUELLE/.htaccess" \
  "$QUELLE/assets" \
  "$QUELLE/_upload/"
find "$QUELLE/_upload" -name ".DS_Store" -delete

# Versionskennung an CSS und JS hängen. Ohne das liefern Browser nach einer
# Änderung das neue HTML mit dem alten, eine Woche lang zwischengespeicherten
# Stylesheet aus — die Seite bricht dann auseinander.
VERSION=$(date +%Y%m%d%H%M)
for DATEI in "$QUELLE/_upload"/*.html; do
  # Stylesheet und Skript
  sed -i '' -E "s|(styles\.css\?v=)[^\"]*|\1$VERSION|g; s|(main\.js\?v=)[^\"]*|\1$VERSION|g" "$DATEI"
  # Bilder: liegen ein Jahr im Zwischenspeicher. Wird ein Foto unter
  # gleichem Namen ausgetauscht, bekämen wiederkehrende Besucher sonst
  # weiter das alte zu sehen. Das Fragezeichen ist aus der Zeichenklasse
  # ausgenommen, damit ein zweiter Lauf nicht doppelt anhängt.
  sed -i '' -E "s#(assets/img/[^\"' ?]+\.(png|jpg|jpeg|webp))\?v=[0-9]*#\1#g" "$DATEI"
  sed -i '' -E "s#(assets/img/[^\"' ?]+\.(png|jpg|jpeg|webp))#\1?v=$VERSION#g" "$DATEI"
done
echo "   Cache-Version: $VERSION"

GROESSE=$(du -sh "$QUELLE/_upload" | cut -f1)
ANZAHL=$(find "$QUELLE/_upload" -type f | wc -l | tr -d ' ')
echo "   $ANZAHL Dateien, $GROESSE"

# --- Befehlsliste für sftp -----------------------------------
BATCH="$(mktemp)"
trap 'rm -f "$BATCH"' EXIT

{
  echo "lcd $QUELLE/_upload"
  echo "cd $ZIEL"
  # Einzeln auflisten, damit auch .htaccess mitgeht —
  # Sammelbefehle überspringen Dateien mit führendem Punkt.
  echo "put index.html"
  echo "put impressum.html"
  echo "put datenschutz.html"
  echo "put 404.html"
  echo "put kontakt.php"
  echo "put .htaccess"
  echo "put -r assets"
  echo "bye"
} > "$BATCH"

echo "→ Verbinde mit $HOST — bitte SFTP-Passwort eingeben:"
# BatchMode=no ist nötig: -b schaltet sonst die Passwortabfrage ab
sftp -o BatchMode=no -P 22 -b "$BATCH" "$USER@$HOST"

echo
echo "→ Prüfe die Website …"
sleep 2
for PFAD in "/" "/impressum" "/datenschutz" "/quatsch"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "https://fitness-park-offenbach.com$PFAD")
  printf "   %-14s %s\n" "$PFAD" "$CODE"
done

echo
echo "✓ Fertig — https://fitness-park-offenbach.com"
