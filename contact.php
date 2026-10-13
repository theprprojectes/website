<?php
declare(strict_types=1);

// Contact form handler for theprproject.es — sends submissions to hola@theprproject.es
// via the Resend transactional email API (credentials in email-config.php).
//
// hola@theprproject.es is a Microsoft 365 mailbox with a hard-fail SPF record,
// so unauthenticated mail from this server (e.g. PHP's mail()) is silently
// rejected by Microsoft. Resend sends on our behalf as a verified domain
// instead, which Microsoft accepts.

header('Content-Type: application/json; charset=utf-8');

function respond(bool $success, string $message = ''): void {
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

/**
 * Send one plain-text email via Resend's transactional email API.
 * Returns true only if Resend accepted the message (HTTP 2xx).
 */
function resendSend(array $cfg, string $to, string $replyTo, string $subject, string $body): bool {
    $payload = [
        'from'     => $cfg['from_name'] . ' <' . $cfg['from'] . '>',
        'to'       => [$to],
        'reply_to' => $replyTo,
        'subject'  => $subject,
        'text'     => $body,
    ];

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $cfg['api_key'],
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT        => 15,
    ]);

    $response  = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        error_log("contact.php Resend request failed: $curlError");
        return false;
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        error_log("contact.php Resend send failed: HTTP $httpCode — $response");
        return false;
    }

    return true;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    respond(false, 'Method not allowed');
}

// Honeypot: real visitors never see or fill this field.
if (trim((string)($_POST['company'] ?? '')) !== '') {
    respond(true);
}

$name    = trim((string)($_POST['name'] ?? ''));
$email   = trim((string)($_POST['email'] ?? ''));
$phone   = trim((string)($_POST['phone'] ?? ''));
$project = trim((string)($_POST['project'] ?? ''));
$message = trim((string)($_POST['message'] ?? ''));
$consent = ($_POST['consent'] ?? '') === 'yes';
$lang    = ($_POST['lang'] ?? 'es') === 'en' ? 'en' : 'es';

if ($name === '' || $message === '' || !$consent || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    respond(false, 'Invalid submission');
}

// Strip line breaks from header-bound values to prevent email header injection.
$stripBreaks = static function (string $value): string {
    return trim(str_replace(["\r", "\n"], ' ', $value));
};
$name    = $stripBreaks($name);
$email   = $stripBreaks($email);
$phone   = $stripBreaks($phone);
$project = $stripBreaks($project);

if ($lang === 'en') {
    $subject   = 'New website message — ' . $name;
    $bodyLines = [
        "Name: $name",
        "Email: $email",
        'Phone: ' . ($phone !== '' ? $phone : '-'),
        'Project type: ' . ($project !== '' ? $project : '-'),
        'GDPR consent: accepted (' . gmdate('c') . ')',
        '',
        'Message:',
        $message,
    ];
} else {
    $subject   = 'Nuevo mensaje web — ' . $name;
    $bodyLines = [
        "Nombre: $name",
        "Email: $email",
        'Teléfono: ' . ($phone !== '' ? $phone : '-'),
        'Tipo de proyecto: ' . ($project !== '' ? $project : '-'),
        'Consentimiento RGPD: aceptado (' . gmdate('c') . ')',
        '',
        'Mensaje:',
        $message,
    ];
}

$body = implode("\n", $bodyLines);

$configPath = __DIR__ . '/email-config.php';
if (!is_file($configPath)) {
    error_log('contact.php: email-config.php is missing');
    http_response_code(500);
    respond(false, 'Mail send failed');
}

$cfg = require $configPath;

if (($cfg['api_key'] ?? '') === '' || $cfg['api_key'] === 'REPLACE_WITH_RESEND_API_KEY') {
    error_log('contact.php: email-config.php api_key not set');
    http_response_code(500);
    respond(false, 'Mail send failed');
}

$sent = resendSend($cfg, $cfg['from'], $email, $subject, $body);

if ($sent) {
    respond(true);
}

http_response_code(500);
respond(false, 'Mail send failed');
