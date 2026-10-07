<?php
/**
 * Eventos del sitio, leídos desde Supabase (tabla "eventos", función eventos_publicos).
 *
 * Las páginas lo cargan como un script:  <script src="api/eventos.php"></script>
 * y entrega  var EVENTOS = { 'nombre-corto': { titulo, fecha, hora, ... }, ... };
 * con el mismo formato que usaba eventos.js, así el resto del sitio no cambia.
 *
 * Para no consultar Supabase en cada visita, guarda una copia por 1 minuto en
 * /home/USUARIO/cerro-eventos-cache.json. Si Supabase no responde, usa la última copia.
 * Los cupos y el encargado NO llegan aquí (Supabase no los entrega a la web).
 */

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-cache');
header('X-Content-Type-Options: nosniff');

const DURACION_CACHE = 60; // segundos

$casa = dirname($_SERVER['DOCUMENT_ROOT'] ?: __DIR__ . '/..');
$rutaConfig = $casa . '/config-cerro.php';
$config = is_readable($rutaConfig) ? require $rutaConfig : [];
$urlSupabase = !empty($config['supabase_url']) ? rtrim($config['supabase_url'], '/') : 'https://oelpndfakeajbticouhl.supabase.co';
$clavePublica = !empty($config['supabase_clave_publica']) ? $config['supabase_clave_publica'] : 'sb_publishable_1o_DMrEfSrUKAhocMOuApQ_UdgH479N';
$rutaCache = $casa . '/cerro-eventos-cache.json';

// 1. Leer de Supabase (o de la copia guardada)
function pedirEventos($url, $clave)
{
    $cabeceras = ['apikey: ' . $clave, 'Content-Type: application/json', 'Accept: application/json'];
    if (function_exists('curl_init')) {
        $c = curl_init($url . '/rest/v1/rpc/eventos_publicos');
        curl_setopt_array($c, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => '{}',
            CURLOPT_HTTPHEADER => $cabeceras,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 5,
        ]);
        $cuerpo = curl_exec($c);
        $codigo = curl_getinfo($c, CURLINFO_HTTP_CODE);
        curl_close($c);
    } else {
        $contexto = stream_context_create(['http' => [
            'method' => 'POST', 'header' => implode("\r\n", $cabeceras), 'content' => '{}',
            'timeout' => 5, 'ignore_errors' => true,
        ]]);
        $cuerpo = @file_get_contents($url . '/rest/v1/rpc/eventos_publicos', false, $contexto);
        $codigo = 0;
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) $codigo = (int) $m[1];
    }
    if ($codigo !== 200 || $cuerpo === false) return null;
    $filas = json_decode($cuerpo, true);
    return is_array($filas) ? $filas : null;
}

$filas = null;
$cacheFresca = is_readable($rutaCache) && (time() - filemtime($rutaCache)) < DURACION_CACHE;
if ($cacheFresca) {
    $filas = json_decode(file_get_contents($rutaCache), true);
}
if (!is_array($filas)) {
    $filas = pedirEventos($urlSupabase, $clavePublica);
    if (is_array($filas)) {
        @file_put_contents($rutaCache, json_encode($filas), LOCK_EX);
    } elseif (is_readable($rutaCache)) {
        $filas = json_decode(file_get_contents($rutaCache), true); // Supabase no respondió: última copia
    }
}
if (!is_array($filas)) $filas = [];

// 2. Dar formato (fechas en español, hora, foto, párrafos...)
$dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
$meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2026-10-08" + "18:30:00" → DateTime (hora de Chile, sin conversiones)
function momento($fecha, $hora)
{
    $f = DateTime::createFromFormat('Y-m-d H:i', substr($fecha, 0, 10) . ' ' . substr($hora, 0, 5));
    return $f ?: null;
}

function textoLimpio($valor)
{
    return trim((string) $valor);
}

$eventos = [];
foreach ($filas as $fila) {
    $id = isset($fila['evento']) ? $fila['evento'] : '';
    $fecha = isset($fila['fecha']) ? (string) $fila['fecha'] : '';
    if (!preg_match('/^[a-z0-9-]{1,60}$/', $id) || !preg_match('/^\d{4}-\d{2}-\d{2}/', $fecha)) continue;

    // Inicio y término (igual que en Supabase): sin hora = todo el día; sin hora de término = 2 horas;
    // si la hora de término es menor que la de inicio, termina al día siguiente
    $horaInicio = isset($fila['hora_inicio']) ? (string) $fila['hora_inicio'] : '';
    $horaFin = isset($fila['hora_fin']) ? (string) $fila['hora_fin'] : '';
    $todoElDia = $horaInicio === '';
    if ($todoElDia) {
        $inicio = momento($fecha, '00:00');
        $fin = momento($fecha, '23:59');
        $hora = 'Por confirmar';
    } else {
        $inicio = momento($fecha, $horaInicio);
        if ($horaFin !== '') {
            $fin = momento($fecha, $horaFin);
            if ($fin && $fin <= $inicio) $fin->modify('+1 day');
            $hora = $inicio->format('H:i') . ' a ' . $fin->format('H:i') . ' horas';
        } else {
            $fin = clone $inicio;
            $fin->modify('+2 hours');
            $hora = $inicio->format('H:i') . ' horas';
        }
    }
    if (!$inicio || !$fin) continue;

    $dia = $dias[(int) $inicio->format('w')] . ' ' . (int) $inicio->format('j');
    $mes = $meses[(int) $inicio->format('n') - 1];
    $estado = textoLimpio(isset($fila['estado']) ? $fila['estado'] : '') ?: 'Inscripciones abiertas';

    $lugar = textoLimpio(isset($fila['lugar']) ? $fila['lugar'] : '') ?: 'Parque Natural Cerro San Francisco';
    $titulo = textoLimpio($fila['titulo']);

    // Foto: link completo, ruta del sitio (img/...) o nombre de archivo en Storage → eventos
    $imagen = textoLimpio(isset($fila['imagen']) ? $fila['imagen'] : '');
    if ($imagen === '') {
        $imagen = 'img/banner-cerro.jpg';
    } elseif (!preg_match('#^https://#i', $imagen) && strpos($imagen, 'img/') !== 0) {
        $imagen = $urlSupabase . '/storage/v1/object/public/eventos/'
            . implode('/', array_map('rawurlencode', explode('/', ltrim($imagen, '/'))));
    }

    // Cada línea del texto es un párrafo
    $parrafos = array_values(array_filter(array_map('trim',
        preg_split('/\R/u', (string) (isset($fila['texto']) ? $fila['texto'] : ''))), 'strlen'));

    $ev = [
        'titulo' => $titulo,
        'estado' => $estado,
        'fecha' => $dia . ' ' . $mes,
        'fechaLarga' => $dia . ' de ' . $mes,
        'hora' => $hora,
        'lugar' => $lugar,
        'direccion' => textoLimpio(isset($fila['direccion']) ? $fila['direccion'] : ''),
        'mapa' => textoLimpio(isset($fila['mapa']) ? $fila['mapa'] : ''),
        'inicio' => $inicio->format('Y-m-d\TH:i'),
        'fin' => $fin->format('Y-m-d\TH:i'),
        'todoElDia' => $todoElDia,
        'img' => $imagen,
        'alt' => textoLimpio(isset($fila['imagen_alt']) ? $fila['imagen_alt'] : '') ?: $titulo,
        'finalizado' => $estado === 'Finalizado',
        'texto' => $parrafos,
    ];
    $externa = textoLimpio(isset($fila['inscripcion_externa']) ? $fila['inscripcion_externa'] : '');
    if (preg_match('#^https?://#i', $externa)) $ev['inscripcionExterna'] = $externa;
    if (!preg_match('#^https?://#i', $ev['mapa'])) $ev['mapa'] = '';

    $eventos[$id] = $ev;
}

// 3. Entregar como script
$json = json_encode((object) $eventos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_PRETTY_PRINT);
echo "// Eventos desde Supabase (tabla \"eventos\"). No editar: se genera solo.\n";
echo 'var EVENTOS = ' . ($json ?: '{}') . ";\n";
