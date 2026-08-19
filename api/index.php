<?php
// Puente entre ServerByt (dominio público) y el Worker Cloudflare (backend).
// El navegador siempre llama a /api/* en autom.ensupresencia.eu; este archivo
// reenvía la petición al Worker sin cambiar DNS ni exponer workers.dev al usuario.

const WORKER_ORIGIN = 'https://0949daf4-bautismos.ensupresenciacrtv.workers.dev';

$uri = $_SERVER['REQUEST_URI'] ?? '/api/health';
$path = parse_url($uri, PHP_URL_PATH) ?: '/api/health';
if (strpos($path, '/api/') !== 0 && $path !== '/api') {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Ruta API no encontrada']);
    exit;
}

$target = WORKER_ORIGIN . ($path === '/api' ? '/api/' : $path);
$query = $_SERVER['QUERY_STRING'] ?? '';
if ($query !== '') $target .= '?' . $query;

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = file_get_contents('php://input');

$headers = [];
foreach (['Content-Type', 'Accept', 'Cookie'] as $name) {
    $value = $_SERVER['HTTP_' . strtoupper(str_replace('-', '_', $name))] ?? null;
    if ($value !== null && $value !== '') $headers[] = $name . ': ' . $value;
}

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_HEADER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 30,
]);
if ($method !== 'GET' && $method !== 'HEAD') curl_setopt($ch, CURLOPT_POSTFIELDS, $body);

$response = curl_exec($ch);
if ($response === false) {
    $error = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'No se pudo conectar con el backend de certificados', 'detail' => $error]);
    exit;
}

$status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$responseHeaders = substr($response, 0, $headerSize);
$responseBody = substr($response, $headerSize);
curl_close($ch);

http_response_code($status ?: 502);
foreach (preg_split("/\r\n|\n|\r/", $responseHeaders) as $line) {
    if ($line === '' || stripos($line, 'HTTP/') === 0) continue;
    [$name, $value] = array_pad(explode(':', $line, 2), 2, '');
    $name = trim($name);
    $value = trim($value);
    if ($name === '') continue;

    // No reenviar CORS del Worker: el navegador ve el mismo origen.
    if (strcasecmp($name, 'access-control-allow-origin') === 0) continue;
    if (strcasecmp($name, 'access-control-allow-credentials') === 0) continue;
    if (strcasecmp($name, 'access-control-allow-headers') === 0) continue;
    if (strcasecmp($name, 'access-control-allow-methods') === 0) continue;

    // La cookie del Worker debe pertenecer al dominio público, no a workers.dev.
    if (strcasecmp($name, 'set-cookie') === 0) {
        $value = preg_replace('/;\\s*Domain=[^;]+/i', '', $value);
        header('Set-Cookie: ' . $value, false);
        continue;
    }
    header($name . ': ' . $value, false);
}

echo $responseBody;
