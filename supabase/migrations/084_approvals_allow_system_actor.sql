-- 084_approvals_allow_system_actor
-- Arregla el bug de auditoria: las operaciones de "sistema" (sin usuario en sesion,
-- p.ej. borrados en cascada por SQL/migraciones) escriben actor_user_id='system',
-- pero la regla solo aceptaba NULL o formato UUID, lo que hacia fallar la operacion.
-- Se amplia la regla para aceptar tambien el valor literal 'system'.
ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_actor_user_id_uuid_format_check;
ALTER TABLE public.approvals ADD CONSTRAINT approvals_actor_user_id_uuid_format_check
  CHECK (
    actor_user_id IS NULL
    OR actor_user_id = 'system'
    OR actor_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );
