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
