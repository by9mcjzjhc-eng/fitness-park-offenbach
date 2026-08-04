#!/usr/bin/env python3
"""
Kopiert alle Mails von einem IMAP-Postfach in ein anderes.

Gedacht für den Fall, dass ein Postfach beim Vertragsumzug seine Adresse
verloren hat und der Inhalt in ein neues Postfach soll.

Kopiert wird serverseitig Ordner für Ordner, mit Datum und Status
(gelesen, markiert). Nichts wird gelöscht — das Quellpostfach bleibt
unverändert.

Der Lauf lässt sich jederzeit abbrechen und später fortsetzen: vorhandene
Nachrichten werden über ihre Message-ID erkannt und übersprungen.

Aufruf:  python3 tools/mail-umzug.py
"""

import imaplib
import getpass
import re
import sys
import time

SERVER = "imap.ionos.de"
PORT = 993

# Große Nachrichten einzeln holen, sonst läuft der Speicher voll
imaplib._MAXLINE = 10_000_000


def frage(text, vorgabe=""):
    wert = input(f"{text}{f' [{vorgabe}]' if vorgabe else ''}: ").strip()
    return wert or vorgabe


def verbinde(adresse, passwort, rolle):
    try:
        c = imaplib.IMAP4_SSL(SERVER, PORT)
        c.login(adresse, passwort)
        print(f"  {rolle}: verbunden")
        return c
    except imaplib.IMAP4.error as e:
        print(f"  {rolle}: Anmeldung fehlgeschlagen — {e}")
        sys.exit(1)


def ordnerliste(c):
    """Liefert die Ordnernamen so, wie der Server sie schreibt."""
    ok, zeilen = c.list()
    if ok != "OK":
        return []
    namen = []
    for z in zeilen:
        if isinstance(z, tuple):
            z = z[0] + b'"' + z[1] + b'"'
        text = z.decode("utf-8", "surrogateescape")
        # (\HasNoChildren) "/" "INBOX"   →   INBOX
        treffer = re.match(r'\([^)]*\)\s+("[^"]*"|NIL)\s+(.+)$', text)
        if not treffer:
            continue
        name = treffer.group(2).strip()
        if name.startswith('"') and name.endswith('"'):
            name = name[1:-1]
        namen.append(name)
    return namen


def zitiert(name):
    return '"' + name.replace('\\', r'\\').replace('"', r'\"') + '"'


def nachrichten_ids(c, ordner):
    """Message-IDs der Nachrichten in einem Ordner — für den Abgleich."""
    if c.select(zitiert(ordner), readonly=True)[0] != "OK":
        return set()
    ok, daten = c.search(None, "ALL")
    if ok != "OK" or not daten[0]:
        return set()
    nummern = daten[0].split()
    ids = set()
    for i in range(0, len(nummern), 200):
        teil = b",".join(nummern[i:i + 200])
        ok, antwort = c.fetch(teil, "(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID)])")
        if ok != "OK":
            continue
        for stueck in antwort:
            if isinstance(stueck, tuple) and stueck[1]:
                t = re.search(rb"<([^>]+)>", stueck[1])
                if t:
                    ids.add(t.group(1))
    return ids


def kopiere_ordner(quelle, ziel, ordner):
    if quelle.select(zitiert(ordner), readonly=True)[0] != "OK":
        print(f"  {ordner}: nicht lesbar, übersprungen")
        return 0, 0

    ok, daten = quelle.search(None, "ALL")
    nummern = daten[0].split() if ok == "OK" and daten[0] else []
    if not nummern:
        print(f"  {ordner}: leer")
        return 0, 0

    ziel.create(zitiert(ordner))          # vorhanden? dann meldet der Server das nur
    schon_da = nachrichten_ids(ziel, ordner)

    kopiert = uebersprungen = 0
    gesamt = len(nummern)

    for i, num in enumerate(nummern, 1):
        # Erst nur die Message-ID holen — spart Übertragung bei Wiederholläufen
        ok, kopf = quelle.fetch(num, "(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID)])")
        mid = None
        if ok == "OK":
            for stueck in kopf:
                if isinstance(stueck, tuple) and stueck[1]:
                    t = re.search(rb"<([^>]+)>", stueck[1])
                    if t:
                        mid = t.group(1)
        if mid and mid in schon_da:
            uebersprungen += 1
            continue

        ok, daten = quelle.fetch(num, "(FLAGS INTERNALDATE RFC822)")
        if ok != "OK" or not daten or not isinstance(daten[0], tuple):
            continue
        beschreibung, rohtext = daten[0][0], daten[0][1]

        t = re.search(rb"FLAGS \(([^)]*)\)", beschreibung)
        flaggen = t.group(1).decode() if t else ""
        # \Recent darf beim Anlegen nicht mitgegeben werden
        flaggen = " ".join(f for f in flaggen.split() if f.lower() != r"\recent")

        try:
            datum = imaplib.Time2Internaldate(imaplib.Internaldate2tuple(beschreibung))
        except Exception:
            datum = None

        try:
            ziel.append(zitiert(ordner), f"({flaggen})" if flaggen else None, datum, rohtext)
            kopiert += 1
            if mid:
                schon_da.add(mid)
        except Exception as e:
            print(f"    Nachricht {i}/{gesamt} nicht kopiert: {e}")

        if i % 25 == 0 or i == gesamt:
            print(f"  {ordner}: {i}/{gesamt}  (neu {kopiert}, vorhanden {uebersprungen})",
                  end="\r", flush=True)

    print(f"  {ordner}: {gesamt} geprüft — {kopiert} kopiert, {uebersprungen} schon vorhanden"
          + " " * 12)
    return kopiert, uebersprungen


def main():
    print("\nMail-Umzug\n" + "=" * 52)
    print("Die Passwörter werden nur an den Mailserver geschickt und")
    print("nirgends gespeichert.\n")

    quelle_adr = frage("Quelle (altes Postfach)",
                       "info_fitness-park-offenba_0@mailboxbackup.info")
    quelle_pw = getpass.getpass("  Passwort Quelle: ")
    ziel_adr = frage("Ziel (neues Postfach)", "info@fitness-park-offenbach.com")
    ziel_pw = getpass.getpass("  Passwort Ziel: ")

    print("\nVerbinde …")
    quelle = verbinde(quelle_adr, quelle_pw, "Quelle")
    ziel = verbinde(ziel_adr, ziel_pw, "Ziel  ")

    ordner = ordnerliste(quelle)
    print(f"\n{len(ordner)} Ordner gefunden: {', '.join(ordner)}\n")

    beginn = time.time()
    summe_neu = summe_alt = 0
    for name in ordner:
        neu, alt = kopiere_ordner(quelle, ziel, name)
        summe_neu += neu
        summe_alt += alt

    for c in (quelle, ziel):
        try:
            c.logout()
        except Exception:
            pass

    dauer = round(time.time() - beginn)
    print(f"\nFertig in {dauer // 60} min {dauer % 60} s")
    print(f"  {summe_neu} Nachrichten kopiert, {summe_alt} waren schon da")
    print("\nDas alte Postfach ist unverändert. Erst löschen, wenn du im")
    print("neuen Postfach stichprobenartig geprüft hast, dass alles da ist.\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nAbgebrochen. Ein erneuter Lauf setzt dort fort, wo es aufhörte.\n")
