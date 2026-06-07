-- 072_supplier_account_type.sql
-- Punto 1 (Reporte Junio 2026): datos bancarios en "Nuevo proveedor".
--
-- La tabla `suppliers` ya tiene `bank_account` (numero de cuenta) y `bank_name`
-- (banco). Faltaba poder registrar el TIPO de cuenta (ahorros / corriente).
--
-- Columna nueva nullable, sin default forzado: los proveedores existentes
-- quedan con `tipo_cuenta = NULL` (sin tipo declarado), no se rompe nada.

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS tipo_cuenta TEXT NULL;

-- CHECK idempotente: solo se permiten 'ahorros' o 'corriente' (o NULL).
ALTER TABLE public.suppliers
  DROP CONSTRAINT IF EXISTS suppliers_tipo_cuenta_check;

ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_tipo_cuenta_check
  CHECK (tipo_cuenta IS NULL OR tipo_cuenta IN ('ahorros', 'corriente'));
