<?php
/**
 * Kontaktformular — Fitness Park Offenbach
 *
 * Nimmt die Anfrage aus index.html entgegen und schickt sie per Mail weiter.
 * Läuft auf jedem Webspace mit PHP (IONOS, All-Inkl, Hetzner …).
 *
 * Antwortet mit JSON, damit das Formular ohne Seitenwechsel abschicken kann.
 * Ohne JavaScript funktioniert es trotzdem — dann kommt eine schlichte
 * HTML-Bestätigung zurück.
 */

declare(strict_types=1);

/* --------------------------------------------------------------------------
   Einstellungen
   -------------------------------------------------------------------------- */
$empfaenger = 'info@fitness-park-offenbach.com';

// Absender muss eine real existierende Adresse der eigenen Domain sein —
// IONOS weist den Versand sonst ab. Wir nehmen dieselbe Adresse wie der
// Empfänger, dann genügt ein einziges Postfach.
$absender = 'info@fitness-park-offenbach.com';

$betreffPrefix = 'Probetraining-Anfrage';

/* --------------------------------------------------------------------------
   Hilfsfunktionen
   -------------------------------------------------------------------------- */
function wantsJson(): bool
{
    $accept = $_SERVER['HTTP_ACCEPT'] ?? '';
    $xhr    = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    return str_contains($accept, 'application/json') || $xhr === 'fetch';
}

function antworten(int $status, string $meldung, bool $ok = false): never
{
    http_response_code($status);

    if (wantsJson()) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $meldung], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Fallback ohne JavaScript: einfache Seite mit Rücklink
    header('Content-Type: text/html; charset=utf-8');
    $text = htmlspecialchars($meldung, ENT_QUOTES, 'UTF-8');
    echo <<<HTML
<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fitness Park Offenbach</title>
<style>
  body{margin:0;min-height:100dvh;display:grid;place-items:center;
       background:#FAF9F7;color:#0D0D0E;
       font:16px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:2rem}
  .box{max-width:34rem;text-align:center}
  h1{font-size:1.6rem;margin:0 0 .75rem}
  a{display:inline-block;margin-top:1.5rem;padding:.85rem 1.6rem;
    background:#D81212;color:#fff;text-decoration:none;border-radius:2px;font-weight:600}
</style></head>
<body><div class="box"><h1>Fitness Park Offenbach</h1><p>{$text}</p>
<a href="index.html">Zurück zur Startseite</a></div></body></html>
HTML;
    exit;
}

function feld(string $name, int $maxLaenge = 2000): string
{
    $wert = trim((string) ($_POST[$name] ?? ''));
    // Zeilenumbrüche aus Kopfzeilen-Feldern entfernen (Header-Injection)
    if ($name !== 'message') {
        $wert = str_replace(["\r", "\n"], ' ', $wert);
    }
    return mb_substr($wert, 0, $maxLaenge);
}

/* --------------------------------------------------------------------------
   Prüfungen
   -------------------------------------------------------------------------- */
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    antworten(405, 'Diese Adresse nimmt nur abgeschickte Formulare entgegen.');
}

// Honeypot: ein für Menschen unsichtbares Feld. Ist es ausgefüllt, war es ein Bot.
// Wir melden trotzdem Erfolg, damit der Bot nichts dazulernt.
if (feld('website') !== '') {
    antworten(200, 'Vielen Dank für deine Anfrage.', true);
}

// Zeitfalle: ein echtes Formular wird nicht in unter drei Sekunden ausgefüllt.
$geladen = (int) feld('loaded');
if ($geladen > 0 && (time() - $geladen) < 3) {
    antworten(200, 'Vielen Dank für deine Anfrage.', true);
}

$name    = feld('name', 120);
$email   = feld('email', 180);
$telefon = feld('tel', 60);
$ziel    = feld('goal', 60);
$text    = feld('message', 4000);
$einwill = feld('privacy', 10);

$fehler = [];
if ($name === '')    { $fehler[] = 'Name'; }
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) { $fehler[] = 'E-Mail'; }
if ($einwill === '') { $fehler[] = 'Einwilligung zum Datenschutz'; }

if ($fehler) {
    antworten(422, 'Bitte prüfe: ' . implode(', ', $fehler) . '.');
}

/* --------------------------------------------------------------------------
   Mail zusammenbauen und verschicken
   -------------------------------------------------------------------------- */
$ziele = [
    'einstieg'  => 'Einstieg ins Training',
    'kraft'     => 'Kraft aufbauen',
    'longevity' => 'Longevity & Gesundheit',
    'ausdauer'  => 'Ausdauer verbessern',
    'reha'      => 'Nach Verletzung zurückkommen',
    'anderes'   => 'Etwas anderes',
];
$zielText = $ziele[$ziel] ?? $ziel;

$betreff = sprintf('%s — %s', $betreffPrefix, $name);

$koerper = implode("\r\n", [
    'Neue Anfrage über das Kontaktformular',
    str_repeat('-', 40),
    '',
    'Name:     ' . $name,
    'E-Mail:   ' . $email,
    'Telefon:  ' . ($telefon !== '' ? $telefon : '—'),
    'Thema:    ' . ($zielText !== '' ? $zielText : '—'),
    '',
    'Nachricht:',
    $text !== '' ? $text : '—',
    '',
    str_repeat('-', 40),
    'Gesendet: ' . date('d.m.Y, H:i') . ' Uhr',
    'IP:       ' . ($_SERVER['REMOTE_ADDR'] ?? 'unbekannt'),
]);

$kopfzeilen = [
    'From: Fitness Park Offenbach <' . $absender . '>',
    'Reply-To: ' . $name . ' <' . $email . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: PHP/' . phpversion(),
];

$gesendet = mail(
    $empfaenger,
    '=?UTF-8?B?' . base64_encode($betreff) . '?=',
    $koerper,
    implode("\r\n", $kopfzeilen),
    '-f' . $absender
);

if (!$gesendet) {
    antworten(
        500,
        'Die Anfrage konnte gerade nicht verschickt werden. '
        . 'Bitte schreib uns direkt an ' . $empfaenger . ' oder ruf an: 069 818424.'
    );
}

antworten(
    200,
    'Danke, ' . $name . ' — deine Anfrage ist bei uns. Wir melden uns '
    . 'normalerweise innerhalb von 24 Stunden.',
    true
);
