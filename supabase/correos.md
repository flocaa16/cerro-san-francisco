# Correos de Amigos del Cerro (en español)

En Supabase → **Authentication → Emails → Templates**. Para cada plantilla, copia el **Asunto**
en "Subject" y el **Cuerpo** en "Message body" (pestaña Source / HTML) → **Save**.

No cambies lo que va entre `{{ }}`: Supabase lo reemplaza por el enlace o el correo de la persona.

---

## 1. Confirm sign up (confirmar cuenta)

**Asunto:**
```
Activa tu cuenta de Amigos del Cerro
```

**Cuerpo:**
```html
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #333333;">
  <h2 style="color: #557458; margin-bottom: 8px;">¡Te damos la bienvenida a Amigos del Cerro!</h2>
  <p style="font-size: 16px; line-height: 1.5;">
    Gracias por unirte a la comunidad del Parque Natural Cerro San Francisco de Curimón.
    Para activar tu cuenta, confirma tu correo con el siguiente botón:
  </p>
  <p style="margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}"
       style="background-color: #557458; color: #FFFFFF; padding: 14px 28px; text-decoration: none; font-weight: bold; display: inline-block;">
      Activar mi cuenta
    </a>
  </p>
  <p style="font-size: 14px; line-height: 1.5; color: #727376;">
    Si no creaste una cuenta en cerrosanfrancisco.cl, puedes ignorar este correo.
  </p>
  <hr style="border: none; border-top: 1px solid #DDDDDD; margin: 24px 0;">
  <p style="font-size: 13px; color: #727376;">
    Cerro San Francisco de Curimón · Una iniciativa de Fundación Lepe<br>
    <a href="https://cerrosanfrancisco.cl" style="color: #557458;">cerrosanfrancisco.cl</a>
  </p>
</div>
```

---

## 2. Reset password (recuperar contraseña)

**Asunto:**
```
Crea una nueva contraseña · Amigos del Cerro
```

**Cuerpo:**
```html
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #333333;">
  <h2 style="color: #557458; margin-bottom: 8px;">Crea una nueva contraseña</h2>
  <p style="font-size: 16px; line-height: 1.5;">
    Recibimos una solicitud para cambiar la contraseña de tu cuenta de Amigos del Cerro
    ({{ .Email }}). Haz clic en el botón para crear una nueva:
  </p>
  <p style="margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}"
       style="background-color: #557458; color: #FFFFFF; padding: 14px 28px; text-decoration: none; font-weight: bold; display: inline-block;">
      Crear nueva contraseña
    </a>
  </p>
  <p style="font-size: 14px; line-height: 1.5; color: #727376;">
    Si no pediste este cambio, ignora este correo: tu contraseña sigue siendo la misma.
  </p>
  <hr style="border: none; border-top: 1px solid #DDDDDD; margin: 24px 0;">
  <p style="font-size: 13px; color: #727376;">
    Cerro San Francisco de Curimón · Una iniciativa de Fundación Lepe<br>
    <a href="https://cerrosanfrancisco.cl" style="color: #557458;">cerrosanfrancisco.cl</a>
  </p>
</div>
```

---

## 3. Change email address (cambio de correo)

**Asunto:**
```
Confirma tu nuevo correo · Amigos del Cerro
```

**Cuerpo:**
```html
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: #333333;">
  <h2 style="color: #557458; margin-bottom: 8px;">Confirma tu nuevo correo</h2>
  <p style="font-size: 16px; line-height: 1.5;">
    Para cambiar el correo de tu cuenta de Amigos del Cerro de {{ .Email }} a {{ .NewEmail }},
    haz clic en el botón:
  </p>
  <p style="margin: 28px 0;">
    <a href="{{ .ConfirmationURL }}"
       style="background-color: #557458; color: #FFFFFF; padding: 14px 28px; text-decoration: none; font-weight: bold; display: inline-block;">
      Confirmar nuevo correo
    </a>
  </p>
  <p style="font-size: 14px; line-height: 1.5; color: #727376;">
    Si no pediste este cambio, ignora este correo.
  </p>
</div>
```
