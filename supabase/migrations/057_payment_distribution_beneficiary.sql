-- 052_payment_distribution_beneficiary.sql
-- Distribución de pagos por beneficiario (contratista o proveedor).
--
-- Antes la distribución de pagos exigía seleccionar una cuenta bancaria interna
-- (tabla bank_accounts), que en la práctica está vacía, por lo que el selector
-- no mostraba opciones. Ahora el pago se asigna a un BENEFICIARIO (contratista o
-- proveedor) y los datos bancarios se copian como snapshot desde su ficha, de
-- modo que quedan congelados al momento del pago aunque luego cambien.
--
-- Cambios:
--   * bank_account_id deja de ser obligatorio (flujo legacy, opcional).
--   * Se agregan columnas de beneficiario y snapshot bancario.
--
-- Idempotente: usa IF EXISTS / IF NOT EXISTS.

-- 1) bank_account_id ya no es obligatorio.
alter table public.payment_distributions
  alter column bank_account_id drop not null;

-- 2) Datos del beneficiario + snapshot bancario.
alter table public.payment_distributions
  add column if not exists beneficiary_type text,
  add column if not exists beneficiary_id   uuid,
  add column if not exists bank_name        text,
  add column if not exists bank_account     text;

-- 3) Validación del tipo de beneficiario (permite NULL para filas legacy).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_distributions_beneficiary_type_check'
  ) then
    alter table public.payment_distributions
      add constraint payment_distributions_beneficiary_type_check
      check (beneficiary_type is null or beneficiary_type in ('contractor', 'supplier'));
  end if;
end $$;
