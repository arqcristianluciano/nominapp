# Avisos por correo (Resend)

Canal de avisos por **correo electrónico**, complementario a las notificaciones
push del navegador. Por ejemplo: avisar al comprador y a la dirección cuando
llega mercancía a almacén.

Si esto **no** está configurado, la app funciona igual; simplemente **no se
envían** los correos (la función responde "omitido" sin error).

---

## Cómo funciona

- La app llama a una función en Supabase llamada **`send-email`** (ya
  desplegada).
- Esa función envía el correo usando **Resend** (servicio de envío de correos).
- Los destinatarios se resuelven solos a partir de los usuarios del proyecto con
  rol comprador/dirección (usa el correo de cada usuario).

A diferencia de las notificaciones push (que hoy solo se disparan de forma
fiable cuando actúa un director), el correo se dispara para **cualquier usuario**
que reciba mercancía (incluido el Almacenista).

---

## Qué tienes que hacer (una sola vez)

### 1) Crear cuenta en Resend y obtener la clave

1. Entra a **resend.com** y crea una cuenta (tiene plan gratuito).
2. **Verifica tu dominio** de correo (o usa el remitente de prueba para empezar).
3. Crea una **API Key** (Settings → API Keys → Create). Cópiala.

### 2) Poner los secretos en Supabase

En **supabase.com → proyecto NominAPP → Edge Functions → Secrets**, agrega:

| Nombre           | Valor                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY` | la clave de API que copiaste de Resend                                                            |
| `RESEND_FROM`    | el remitente, ej: `NominAPP <avisos@tudominio.com>` (debe ser de un dominio verificado en Resend) |

> Mientras no verifiques un dominio, Resend solo permite enviarte correos **a ti
> mismo** (al correo de tu cuenta) usando el remitente de prueba
> `onboarding@resend.dev`. Para enviar a todo el equipo, verifica tu dominio.

¡Eso es todo! Los secretos de Supabase se activan solos; no hay que volver a
publicar nada.

---

## Cómo comprobar que funciona

1. Asegúrate de que los usuarios (comprador/director) tengan **correo** cargado
   en su perfil.
2. Recibe una orden de compra en la app.
3. A esos usuarios debe llegarles un correo con el aviso.

Si no llega: revisa en Resend el panel de **Logs/Emails** para ver si se envió o
hubo error (dominio no verificado, etc.).

---

## Detalle técnico (para referencia)

- Función: `supabase/functions/send-email/index.ts`.
- Servicio en la app: `src/services/emailNotificationService.ts`.
- Se invoca (best-effort) desde `requisitionService.notifyReceipt`, junto al push.
- Secreto opcional `INTERNAL_EMAIL_SECRET` para llamadas server-to-server (cron).
