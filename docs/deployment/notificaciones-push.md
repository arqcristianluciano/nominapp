# Notificaciones push (avisos automáticos)

Guía sencilla para activar los avisos automáticos (por ejemplo: avisar al
comprador y a la dirección cuando llega mercancía a almacén).

Si esto **no** está configurado, la app funciona igual de bien; lo único es que
**no se envían** esos avisos.

---

## Qué hace falta

Unas "llaves" (claves VAPID) que autorizan al sistema a enviar notificaciones
al navegador/teléfono. Son tres datos que se pegan en dos lugares:

| Dato                           | Dónde va              | ¿Secreto?                                     |
| ------------------------------ | --------------------- | --------------------------------------------- |
| Clave **pública**              | Vercel **y** Supabase | No (es pública)                               |
| Clave **privada**              | Solo Supabase         | **Sí — nunca en el repositorio ni en Vercel** |
| Asunto (un correo de contacto) | Solo Supabase         | No                                            |

> La clave **privada** se generó y se guardó **solo** en los secretos de Supabase
> (`VAPID_PRIVATE_KEY`). Por seguridad **no** se escribe en este repositorio.

---

## Clave pública del proyecto

```
BLEAj9IZ12U3wBRw_DTMJZZONz1N-oSC6C4nkhG29PbL-wFm0izUfWI1inxx7eKAjnXGCU3GLlUHwPM3etVMcuI
```

Debe quedar **idéntica** en los dos lugares (Vercel y Supabase).

---

## Paso a paso

### 1) En Vercel (proyecto `nominapp-rd`)

1. **Settings → Environment Variables → Add New**.
2. Nombre: `VITE_PUSH_VAPID_PUBLIC_KEY` · Valor: la clave pública de arriba.
3. Marca **Production** (y las demás). Guarda.

### 2) En Supabase (proyecto `NominAPP`)

**Edge Functions → Secrets**, agrega tres:

| Nombre              | Valor                                   |
| ------------------- | --------------------------------------- |
| `VAPID_PUBLIC_KEY`  | la misma clave pública de arriba        |
| `VAPID_PRIVATE_KEY` | (la clave privada generada — solo aquí) |
| `VAPID_SUBJECT`     | `mailto:arqcristianluciano@gmail.com`   |

### 3) Volver a publicar en Vercel

Las variables de Vercel se activan en la próxima publicación:
**Deployments → (último) → … → Redeploy**.

(Los secretos de Supabase se activan solos.)

---

## Cómo comprobar que funciona

1. Abre la app desde el celular o navegador.
2. Cuando pida permiso de notificaciones, dale **Permitir**.
3. Al recibir una orden de compra, al comprador/dirección debe llegarle el aviso.

## Si alguna vez hay que regenerar las llaves

Se generan con un comando de Node (par de claves P‑256). Si pierdes la privada,
hay que generar un par nuevo y reemplazar los tres valores en los dos lugares;
los dispositivos ya suscritos tendrán que volver a aceptar el permiso.
