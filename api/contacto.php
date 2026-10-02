<?php
/**
 * Formularios de contacto (footer de todas las páginas y "Educación en la naturaleza").
 * Envía el mensaje al correo configurado en /home/USUARIO/config-cerro.php:
 *   'contacto_destino'  → formulario "Contáctanos" del footer
 *   'educacion_destino' → formulario de "Educación en la naturaleza" (si falta, usa contacto_destino)
 * Al responder ese correo, la respuesta le llega directo a quien escribió (Reply-To).
 */

header('Content-Type: application/json; charset=utf-8');

function responder($codigo, $mensaje)
{
    http_response_code($codigo);
    echo json_encode(['ok' => $codigo < 300, 'mensaje' => $mensaje]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, 'Método no permitido');
}

// Solo desde el propio sitio
$origen = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : (isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : '');
$host = parse_url($origen, PHP_URL_HOST);
if (!$host || !preg_match('/(^|\.)cerrosanfrancisco\.cl$/i', $host)) {
    responder(403, 'Origen no permitido');
}

// Campo trampa: las personas no lo ven; los robots lo llenan
if (!empty($_POST['sitio_web'])) {
    responder(200, 'Mensaje enviado'); // se finge éxito y no se envía nada
}

// Configuración (fuera de public_html)
$rutaConfig = dirname($_SERVER['DOCUMENT_ROOT']) . '/config-cerro.php';
$config = is_readable($rutaConfig) ? require $rutaConfig : [];
$destino = !empty($config['contacto_destino']) ? $config['contacto_destino'] : 'contacto@fundacionlepe.cl';
// Cada formulario puede llegar a una persona distinta
if (isset($_POST['formulario']) && $_POST['formulario'] === 'educacion' && !empty($config['educacion_destino'])) {
    $destino = $config['educacion_destino'];
}
$remitente = !empty($config['remitente']) ? $config['remitente'] : 'no-responder@cerrosanfrancisco.cl';

// Límite: máximo 5 mensajes por hora desde la misma conexión
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'desconocida';
$archivoLimite = sys_get_temp_dir() . '/cerro-contacto-' . md5($ip) . '.json';
$envios = is_readable($archivoLimite) ? (json_decode(file_get_contents($archivoLimite), true) ?: []) : [];
$envios = array_values(array_filter($envios, function ($t) {
    return $t > time() - 3600;
}));
if (count($envios) >= 5) {
    responder(429, 'Enviaste varios mensajes seguidos. Inténtalo de nuevo en una hora.');
}

// Datos (una línea, sin saltos, con largo máximo)
$campo = function ($nombre, $largo = 120) {
    $valor = isset($_POST[$nombre]) ? trim((string) $_POST[$nombre]) : '';
    $valor = preg_replace('/[\r\n\t]+/', ' ', $valor);
    return function_exists('mb_substr') ? mb_substr($valor, 0, $largo) : substr($valor, 0, $largo);
};
$nombre = trim($campo('nombre') . ' ' . $campo('apellido'));
$correo = $campo('correo', 200);
$institucion = $campo('institucion');
$comuna = $campo('comuna');
$asunto = $campo('asunto') ?: 'Mensaje desde la web';
$pagina = $campo('pagina', 200);
$mensaje = isset($_POST['mensaje']) ? trim((string) $_POST['mensaje']) : '';
$mensaje = function_exists('mb_substr') ? mb_substr($mensaje, 0, 5000) : substr($mensaje, 0, 5000);

if ($nombre === '') {
    responder(422, 'Escribe tu nombre.');
}
if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    responder(422, 'Escribe un correo válido para poder responderte.');
}
if ($mensaje === '' && $institucion === '') {
    responder(422, 'Escribe tu mensaje.');
}

$e = function ($t) {
    return htmlspecialchars((string) $t, ENT_QUOTES, 'UTF-8');
};
$fila = function ($etiqueta, $valor) use ($e) {
    if ($valor === '') return '';
    return '<tr><td style="padding: 6px 12px 6px 0; color: #727376; vertical-align: top;">' . $e($etiqueta)
        . '</td><td style="padding: 6px 0;">' . $e($valor) . '</td></tr>';
};

$html = '<!doctype html><html lang="es"><body style="margin: 0; padding: 24px; background-color: #F2F7F2;">
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background-color: #FFFFFF; color: #333333;">
  <h2 style="color: #557458; margin: 0 0 16px 0;">' . $e($asunto) . '</h2>
  <table style="font-size: 15px; border-collapse: collapse;">'
    . $fila('Nombre', $nombre)
    . $fila('Correo', $correo)
    . $fila('Institución', $institucion)
    . $fila('Comuna', $comuna)
    . $fila('Página', $pagina) . '
  </table>
  <p style="font-size: 15px; line-height: 1.6; white-space: pre-wrap; padding: 16px; background-color: #F2F7F2; margin: 20px 0;">'
    . nl2br($e($mensaje ?: '(sin mensaje)')) . '</p>
  <p style="font-size: 13px; color: #727376; margin: 0;">
    Para contestar, responde este correo: la respuesta le llega a ' . $e($correo) . '.
  </p>
</div>
</body></html>';

$cabeceras = implode("\r\n", [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: =?UTF-8?B?' . base64_encode('Web Cerro San Francisco') . '?= <' . $remitente . '>',
    'Reply-To: =?UTF-8?B?' . base64_encode($nombre) . '?= <' . $correo . '>',
]);
$asuntoCorreo = '=?UTF-8?B?' . base64_encode($asunto . ' · ' . $nombre) . '?=';

if (!mail($destino, $asuntoCorreo, $html, $cabeceras, '-f' . $remitente)) {
    responder(500, 'No pudimos enviar tu mensaje. Inténtalo más tarde o escríbenos a contacto@fundacionlepe.cl.');
}

$envios[] = time();
@file_put_contents($archivoLimite, json_encode($envios));
responder(200, 'Mensaje enviado');
