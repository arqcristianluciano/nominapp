-- Fix login error: "converting NULL to string is unsupported"
--
-- Las cuentas @nominapp.local (commit 967b1b4) se crearon insertando directamente
-- en auth.users por SQL. El flow normal de Supabase Auth inicializa los campos
-- de token con cadena vacía (''), pero al hacer INSERT manual quedaron en NULL.
-- GoTrue intenta escanear esas columnas como string y devuelve 500 con
-- "Database error querying schema", que el cliente ve como "Usuario o
-- contraseña incorrectos".

UPDATE auth.users
SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change               = COALESCE(email_change, ''),
  reauthentication_token     = COALESCE(reauthentication_token, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change_token_new IS NULL
  OR email_change_token_current IS NULL
  OR email_change IS NULL
  OR reauthentication_token IS NULL
  OR phone_change IS NULL
  OR phone_change_token IS NULL;
