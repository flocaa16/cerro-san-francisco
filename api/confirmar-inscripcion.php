<?php
/**
 * Correo de confirmación de inscripción a un evento.
 *
 * Supabase llama a este archivo (Database Webhook) cada vez que se agrega una fila en la tabla
 * "inscripciones", y aquí se envía el correo desde no-responder@cerrosanfrancisco.cl.
 *
 * La clave secreta NO está en este archivo (el repositorio es público): se guarda en
 * /home/USUARIO/config-cerro.php, fuera de public_html. Ver supabase/LEEME.md.
 */

header('Content-Type: application/json; charset=utf-8');

function responder($codigo, $mensaje)
{
    http_response_code($codigo);
    echo json_encode(['ok' => $codigo < 300, 'mensaje' => $mensaje]);
    exit;
}

// Registro de envíos (fuera de public_html) para revisar si un correo salió: /home/USUARIO/cerro-correos.log
function registrar($texto)
{
    $ruta = dirname($_SERVER['DOCUMENT_ROOT']) . '/cerro-correos.log';
    @file_put_contents($ruta, date('Y-m-d H:i:s') . ' | ' . $texto . "\n", FILE_APPEND);
}

// 1. Configuración (fuera de public_html)
$rutaConfig = dirname($_SERVER['DOCUMENT_ROOT'] ?: __DIR__ . '/..') . '/config-cerro.php';
if (!is_readable($rutaConfig)) {
    responder(500, 'Falta el archivo de configuración');
}
$config = require $rutaConfig;
$claveEsperada = isset($config['webhook_clave']) ? $config['webhook_clave'] : '';
$remitente = isset($config['remitente']) ? $config['remitente'] : 'no-responder@cerrosanfrancisco.cl';
$responderA = isset($config['responder_a']) ? $config['responder_a'] : 'contacto@fundacionlepe.cl';

// 2. Solo Supabase (con la clave secreta) puede usar este archivo
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(405, 'Método no permitido');
}
$claveRecibida = isset($_SERVER['HTTP_X_WEBHOOK_CLAVE']) ? $_SERVER['HTTP_X_WEBHOOK_CLAVE'] : '';
if ($claveEsperada === '' || !hash_equals($claveEsperada, $claveRecibida)) {
    responder(401, 'No autorizado');
}

// 3. Datos de la inscripción (formato de los Database Webhooks de Supabase)
$cuerpo = json_decode(file_get_contents('php://input'), true);
$fila = isset($cuerpo['record']) ? $cuerpo['record'] : null;
if (!$fila || (isset($cuerpo['type']) && $cuerpo['type'] !== 'INSERT')) {
    responder(200, 'Nada que enviar');
}

$correo = isset($fila['correo']) ? trim($fila['correo']) : '';
if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    responder(422, 'Correo no válido');
}

$e = function ($texto) {
    return htmlspecialchars((string) $texto, ENT_QUOTES, 'UTF-8');
};

$nombre = isset($fila['nombre']) ? $fila['nombre'] : '';
$titulo = !empty($fila['evento_titulo']) ? $fila['evento_titulo'] : 'Evento en el Cerro San Francisco';
$fecha = isset($fila['evento_fecha']) ? $fila['evento_fecha'] : '';
$hora = isset($fila['evento_hora']) ? $fila['evento_hora'] : '';
$lugar = !empty($fila['evento_lugar']) ? $fila['evento_lugar'] : 'Parque Natural Cerro San Francisco';
$personas = isset($fila['personas']) && is_array($fila['personas']) ? $fila['personas'] : [];
$cantidad = isset($fila['cantidad']) ? (int) $fila['cantidad'] : 1;
$direccion = !empty($fila['evento_direccion']) ? $fila['evento_direccion'] : $lugar . ', Curimón, San Felipe';
$urlMapa = 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode($direccion);

// Personas inscritas: nombres (Amigo del Cerro) o cantidad (invitado)
if (count($personas) > 0) {
    $listaPersonas = '<ul style="margin: 8px 0 0 0; padding-left: 20px;">';
    foreach ($personas as $persona) {
        $listaPersonas .= '<li>' . $e($persona) . '</li>';
    }
    $listaPersonas .= '</ul>';
} else {
    $listaPersonas = $cantidad . ($cantidad === 1 ? ' persona' : ' personas');
}

// Enlace para agregar el evento a Google Calendar
$botonCalendario = '';
if (!empty($fila['evento_inicio']) && !empty($fila['evento_fin'])) {
    $compacta = function ($t) {
        return str_replace(['-', ':'], '', $t) . '00';
    };
    $urlCalendario = 'https://calendar.google.com/calendar/render?' . http_build_query([
        'action' => 'TEMPLATE',
        'text' => $titulo,
        'dates' => $compacta($fila['evento_inicio']) . '/' . $compacta($fila['evento_fin']),
        'ctz' => 'America/Santiago',
        'details' => $titulo . ' · ' . $lugar . '. Cómo llegar: ' . $urlMapa . ' · https://cerrosanfrancisco.cl/actividades',
        'location' => $direccion,
    ]);
    $botonCalendario = '<p style="margin: 28px 0;"><a href="' . $e($urlCalendario) . '" '
        . 'style="background-color: #557458; color: #FFFFFF; padding: 14px 28px; text-decoration: none; '
        . 'font-weight: bold; display: inline-block;">Agregar a Google Calendar</a></p>';
}

$asunto = 'Inscripción confirmada: ' . $titulo;

$html = '<!doctype html><html lang="es"><body style="margin: 0; padding: 24px; background-color: #F2F7F2;">
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background-color: #FFFFFF; color: #333333;">
  <h2 style="color: #557458; margin: 0 0 8px 0;">¡Inscripción confirmada!</h2>
  <p style="font-size: 16px; line-height: 1.5;">Hola ' . $e($nombre) . ', te esperamos en:</p>

  <div style="padding: 16px; background-color: #F2F7F2; margin: 16px 0;">
    <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold;">' . $e($titulo) . '</p>
    <p style="margin: 0; font-size: 15px; line-height: 1.6;">
      ' . $e($fecha) . ($hora ? ' · ' . $e($hora) : '') . '<br>' . $e($lugar) . '<br>' . $e($direccion) . '
    </p>
    <p style="margin: 8px 0 0 0; font-size: 15px;"><a href="' . $e($urlMapa) . '" style="color: #557458; font-weight: bold;">Ver cómo llegar en Google Maps</a></p>
  </div>

  <p style="font-size: 16px; line-height: 1.5; margin-bottom: 0;"><strong>Personas inscritas:</strong></p>
  <div style="font-size: 16px; line-height: 1.5;">' . $listaPersonas . '</div>

  ' . $botonCalendario . '

  <p style="font-size: 16px; line-height: 1.5; margin-bottom: 4px;"><strong>Recomendaciones para tu visita</strong></p>
  <ul style="font-size: 15px; line-height: 1.6; margin-top: 0; padding-left: 20px;">
    <li>Usa zapatillas o calzado cómodo para caminar.</li>
    <li>Lleva agua, gorro y bloqueador solar.</li>
    <li>No dejes rastro: llévate tu basura y no saques plantas ni animales.</li>
  </ul>

  <p style="font-size: 14px; line-height: 1.5; color: #727376;">
    Si no puedes asistir, avísanos respondiendo este correo para liberar tu cupo.
  </p>
  <hr style="border: none; border-top: 1px solid #DDDDDD; margin: 24px 0;">
  <p style="font-size: 13px; color: #727376; margin: 0;">
    Cerro San Francisco de Curimón · Una iniciativa de Fundación Lepe<br>
    <a href="https://cerrosanfrancisco.cl" style="color: #557458;">cerrosanfrancisco.cl</a>
  </p>
</div>
</body></html>';

// 4. Enviar (desde el servidor de correo de cPanel, firmado con DKIM)
$cabeceras = implode("\r\n", [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'From: =?UTF-8?B?' . base64_encode('Cerro San Francisco de Curimón') . '?= <' . $remitente . '>',
    'Reply-To: ' . $responderA,
]);
$asuntoCodificado = '=?UTF-8?B?' . base64_encode($asunto) . '?=';

$enviado = mail($correo, $asuntoCodificado, $html, $cabeceras, '-f' . $remitente);
registrar('inscripción (confirmación) | para: ' . $correo . ' | ' . ($enviado ? 'ENVIADO' : 'FALLÓ'));

// 5. Aviso a la persona que gestiona las inscripciones de ESTE evento:
//    - si el evento tiene  encargado: 'aves'  (eventos.js), se usa 'aves_destino' de config-cerro.php
//    - si no, 'inscripciones_destino'; y si tampoco está, 'contacto_destino'
//    (cada destino puede tener varios correos separados por coma)
$encargado = isset($fila['evento_encargado']) ? strtolower(trim((string) $fila['evento_encargado'])) : '';
if (!preg_match('/^[a-z0-9_]{1,40}$/', $encargado)) $encargado = '';
if ($encargado !== '' && !empty($config[$encargado . '_destino'])) {
    $gestor = $config[$encargado . '_destino'];
} else {
    $gestor = !empty($config['inscripciones_destino']) ? $config['inscripciones_destino']
        : (!empty($config['contacto_destino']) ? $config['contacto_destino'] : '');
}
$avisoEnviado = false;
if ($gestor !== '') {
    $filaDato = function ($etiqueta, $valor) use ($e) {
        if ($valor === '' || $valor === null) return '';
        return '<tr><td style="padding: 6px 16px 6px 0; color: #727376; vertical-align: top; white-space: nowrap;">'
            . $e($etiqueta) . '</td><td style="padding: 6px 0;">' . $valor . '</td></tr>';
    };
    $apellido = isset($fila['apellido']) ? $fila['apellido'] : '';
    $tipo = isset($fila['tipo']) ? $fila['tipo'] : '';
    $telefono = isset($fila['telefono']) ? $fila['telefono'] : '';
    $comuna = isset($fila['comuna']) ? $fila['comuna'] : '';
    $crearCuenta = !empty($fila['crear_cuenta']);

    $htmlGestor = '<!doctype html><html lang="es"><body style="margin: 0; padding: 24px; background-color: #F2F7F2;">
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background-color: #FFFFFF; color: #333333;">
  <h2 style="color: #557458; margin: 0 0 8px 0;">Nueva inscripción</h2>
  <p style="font-size: 16px; margin: 0 0 16px 0;"><strong>' . $e($titulo) . '</strong><br>'
      . $e($fecha) . ($hora ? ' · ' . $e($hora) : '') . '<br>' . $e($lugar) . '</p>
  <table style="font-size: 15px; border-collapse: collapse;">'
      . $filaDato('Nombre', $e(trim($nombre . ' ' . $apellido)))
      . $filaDato('Tipo', $e($tipo))
      . $filaDato('Correo', '<a href="mailto:' . $e($correo) . '" style="color: #557458;">' . $e($correo) . '</a>')
      . $filaDato('Teléfono', $e($telefono))
      . $filaDato('Comuna', $e($comuna))
      . $filaDato('Cantidad', $e($cantidad . ($cantidad === 1 ? ' persona' : ' personas')))
      . $filaDato('Personas', count($personas) ? $listaPersonas : '')
      . $filaDato('Quiere crear cuenta', $crearCuenta ? 'Sí' : '') . '
  </table>
  <p style="font-size: 13px; color: #727376; margin: 24px 0 0 0;">
    Para escribirle, responde este correo: la respuesta le llega a ' . $e($correo) . '.<br>
    La lista completa de inscritos está en Supabase → Table Editor → inscritos_por_evento.
  </p>
</div>
</body></html>';

    $cabecerasGestor = implode("\r\n", [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: =?UTF-8?B?' . base64_encode('Web Cerro San Francisco') . '?= <' . $remitente . '>',
        'Reply-To: ' . $correo,
    ]);
    $asuntoGestor = '=?UTF-8?B?' . base64_encode('Nueva inscripción: ' . $titulo . ' · ' . trim($nombre . ' ' . $apellido)
        . ($cantidad > 1 ? ' (' . $cantidad . ' personas)' : '')) . '?=';
    $avisoEnviado = mail($gestor, $asuntoGestor, $htmlGestor, $cabecerasGestor, '-f' . $remitente);
    registrar('inscripción (aviso equipo' . ($encargado !== '' ? ': ' . $encargado : '') . ') | para: ' . $gestor . ' | ' . ($avisoEnviado ? 'ENVIADO' : 'FALLÓ'));
}

if (!$enviado) {
    responder(500, 'No se pudo enviar el correo');
}
responder(200, $avisoEnviado ? 'Correo enviado (y aviso al equipo)' : 'Correo enviado');
