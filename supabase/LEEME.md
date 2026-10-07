# Amigos del Cerro con Supabase

Las cuentas, los perfiles y las inscripciones se guardan en Supabase.
El código está en `cuenta.js`; las tablas y reglas de seguridad en `supabase/supabase.sql`.

## 1. Crear el proyecto
1. Entra a https://supabase.com → **Start your project** (puedes entrar con GitHub).
2. **New project**: nombre `cerro-san-francisco`, región **South America (São Paulo)**, y una contraseña de base de datos (guárdala, no va en el código).

## 2. Crear las tablas
1. Menú izquierdo → **SQL Editor** → **New query**.
2. Pega todo `supabase/supabase.sql` → **Run**. Debe decir "Success".

## 3. Conectar la web
1. Arriba → **Connect** (o Project Settings → API).
2. Copia la **Project URL** y la clave **anon / publishable**.
3. Pégalas al inicio de `cuenta.js` en `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
   ⚠️ Nunca uses la clave **service_role / secret**.

## 4. Direcciones permitidas
**Authentication → URL Configuration**
- Site URL: `https://cerrosanfrancisco.cl`
- Redirect URLs: `https://cerrosanfrancisco.cl/**`

## 5. Correos
- **Authentication → Sign In / Providers → Email**: deja activado **Confirm email** (evita cuentas con correos falsos).
- **Authentication → Emails → Templates**: traduce al español "Confirm signup" y "Reset password".
- El servidor de correo de Supabase gratis manda muy pocos correos por hora (solo para pruebas).
  Antes de lanzar: crea `no-responder@cerrosanfrancisco.cl` en cPanel → **Cuentas de correo**, y en
  **Authentication → Emails → SMTP Settings** pon los datos SMTP de esa cuenta (cPanel los muestra en
  "Connect Devices": servidor `mail.cerrosanfrancisco.cl`, puerto 465).

## 6. Ingreso con Google (opcional)
1. https://console.cloud.google.com → crea un proyecto → **APIs y servicios → Pantalla de consentimiento de OAuth** (externo, nombre "Cerro San Francisco").
2. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**.
   - URI de redireccionamiento autorizado: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
     (aparece en Supabase → Authentication → Sign In / Providers → Google).
3. Copia el **ID de cliente** y el **Secreto** en Supabase → Google → **Enable** → Save.

## 7. Ver los inscritos (para la fundación)
**Table Editor** → `inscritos_por_evento` (o `inscripciones`). Filtra por evento y usa **Export → CSV** para abrirlo en Excel.
Para invitar a alguien de la fundación: **Project Settings → Team → Invite** (no le pases tu contraseña).

## Probar
Prueba en `https://cerrosanfrancisco.cl/amigos` después de hacer el deploy: los links sin `.html`
(`perfil`, `amigos`) solo funcionan en el servidor de cPanel.

## 8. Correo de confirmación de inscripción
Cuando alguien se inscribe a un evento, Supabase avisa a `api/confirmar-inscripcion.php` (en cPanel)
y ese archivo envía el correo desde `no-responder@cerrosanfrancisco.cl`.

1. **cPanel → Administrador de archivos**, en tu carpeta de inicio (`/home/USUARIO`, la que contiene
   `public_html`, NO dentro de ella) crea el archivo `config-cerro.php` con:
   ```php
   <?php
   return [
       'webhook_clave' => 'PEGA-AQUI-LA-CLAVE-SECRETA',
       'remitente'     => 'no-responder@cerrosanfrancisco.cl',
       'responder_a'   => 'contacto@fundacionlepe.cl',
   ];
   ```
   Este archivo nunca va al repositorio (es público).
2. **Supabase → Database → Webhooks → Create a new hook**:
   - Table: `inscripciones` · Events: **Insert**
   - Type: **HTTP Request** · Method: **POST**
   - URL: `https://cerrosanfrancisco.cl/api/confirmar-inscripcion.php`
   - HTTP Headers → Add: `X-Webhook-Clave` = la misma clave secreta del paso 1
3. Inscríbete a un evento de prueba y revisa tu correo.

## 9. Eventos (se crean y editan en Supabase, sin tocar código)
Los eventos están en **Supabase → Table Editor → tabla `eventos`**, una fila por evento.
La web los lee con `api/eventos.php` (guarda una copia por 1 minuto: los cambios tardan hasta 1 minuto en verse).

**Primera vez:** correr `supabase.sql` completo y después `eventos-iniciales.sql` (pasa los eventos que
estaban en `eventos.js` a la tabla). Ambos se pueden correr de nuevo sin perder datos.

**Crear un evento:** Table Editor → `eventos` → **Insert row**:

| Columna | Qué poner |
|---|---|
| `evento` | Nombre corto para el link, solo minúsculas, números y guiones (ej. `taller-otono` → `inscripcion?evento=taller-otono`). No cambiarlo después de publicar. |
| `titulo` | Nombre del evento. |
| `estado` | `Inscripciones abiertas` (verde), `Quedan pocos cupos` (amarillo) o `Inscripciones cerradas` (rojo). |
| `inicio` / `fin` | Fecha y hora en hora de Chile, ej. `2026-10-08 18:30`. La fecha en español ("Jueves 8 de octubre") se arma sola. Al pasar `fin`, el evento se oculta solo. Sin `fin` = 2 horas. |
| `hora` | Opcional. Vacío = se arma sola ("18:30 a 20:00 horas"). Para otro texto, ej. `Por confirmar`. |
| `lugar` / `direccion` | Nombre del lugar y dirección (para el mapa y el calendario). |
| `mapa` | Opcional: link de Google Maps. Vacío = se arma con la dirección. |
| `imagen` | Foto: sube el archivo en **Storage → eventos** y escribe aquí su nombre (ej. `taller.jpg`). También sirve un link completo. Vacío = foto del cerro. |
| `imagen_alt` | Descripción de la foto para personas ciegas. Vacío = el título. |
| `texto` | Descripción. Cada línea es un párrafo. |
| `inscripcion_externa` | Opcional: link a un formulario de otro sitio. El botón "Inscribirme" abre ese link (esas inscripciones no pasan por Supabase). |
| `cupos` | Máximo de personas (0 = sin límite). No se muestra en la web; al llenarse aparece "Inscripciones cerradas". |
| `encargado` | Etiqueta de quien recibe los avisos (definida en `config-cerro.php`, ver abajo). Vacío = `inscripciones_destino`. |
| `publicado` | Desmarcado = borrador (no se ve en la web). |
| `finalizado` | Marcado = se termina antes de tiempo (ej. si se suspende). |

En el Inicio se ven los 3 próximos eventos; en Actividades, todos.

**Encargados** (cPanel, `config-cerro.php`, una sola vez; varios correos separados por coma):
```php
'encargados' => [
    'encargado-uno' => 'persona.uno@fundacionlepe.cl',
    'encargado-dos' => 'persona.dos@fundacionlepe.cl, otra@fundacionlepe.cl',
],
```

**Qué hace Supabase al recibir una inscripción** (aunque dos lleguen al mismo tiempo):
- Toma cupos y encargado de la tabla `eventos` (lo que mande la web se ignora).
- Cuenta a todas las personas inscritas (la cantidad nunca puede ser menor que los nombres enviados).
- Si no caben, la rechaza: la web muestra "Inscripciones cerradas" o pide inscribir a menos personas.
- Un invitado no puede inscribirse dos veces con el mismo correo al mismo evento.
- Un Amigo del Cerro que cambia su inscripción reemplaza la anterior (no ocupa cupos dos veces).
- Al cancelar una inscripción, o borrarla en Table Editor, el cupo se libera.
La web solo sabe si cada evento está abierto o cerrado; nunca cuántos cupos quedan ni quién es el encargado.
