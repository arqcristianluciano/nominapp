-- 091_bank_accounts_internal_sin_proyecto
-- Permite guardar cuentas bancarias internas (de la empresa) sin proyecto.
--
-- La migración 048 puso project_id NOT NULL en bank_accounts como refuerzo
-- de pertenencia, pero el diseño de la app contempla cuentas internas de la
-- empresa que no son de ningún proyecto (is_internal = true): el formulario
-- de Configuración las crea sin proyecto y bankAccountService.getByProject
-- las incluye siempre con `OR is_internal = true`. Ese choque hacía
-- imposible registrar cuentas ("null value in column project_id ...").
--
-- Se relaja el NOT NULL pero se conserva la intención de integridad con un
-- CHECK: solo las cuentas internas pueden quedar sin proyecto.

ALTER TABLE public.bank_accounts
  ALTER COLUMN project_id DROP NOT NULL;

ALTER TABLE public.bank_accounts
  DROP CONSTRAINT IF EXISTS bank_accounts_project_required_unless_internal;

ALTER TABLE public.bank_accounts
  ADD CONSTRAINT bank_accounts_project_required_unless_internal
  CHECK (is_internal OR project_id IS NOT NULL);
