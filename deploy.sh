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
sftp -P 22 -b "$BATCH" "$USER@$HOST"

echo
echo "→ Prüfe die Website …"
sleep 2
for PFAD in "/" "/impressum" "/datenschutz" "/quatsch"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -m 15 "https://fitness-park-offenbach.com$PFAD")
  printf "   %-14s %s\n" "$PFAD" "$CODE"
done

echo
echo "✓ Fertig — https://fitness-park-offenbach.com"
