-- =====================================================
-- NominApp - Migración 075: refuerzos de integridad (candados)
-- Derivados de la auditoría interna 2026-06-07. Verificado que NO hay datos
-- en conflicto antes de aplicar (stock negativo, descuentos <=0, nombres de
-- proveedor / números de requisición / códigos de material duplicados: 0).
--
-- NOTA: los refuerzos de "suma atómica" de stock e importes (RPC) y la columna
-- de adelantos ya descontados quedan documentados como mejora futura; el código
-- ya trae mitigaciones para esos casos.
-- =====================================================

-- 1) El descuento de préstamo siempre debe ser positivo.
ALTER TABLE public.loan_deductions DROP CONSTRAINT IF EXISTS loan_deductions_amount_positive;
ALTER TABLE public.loan_deductions
  ADD CONSTRAINT loan_deductions_amount_positive CHECK (amount > 0);

-- 2) Nombre de proveedor único entre los activos (sin distinguir mayúsculas/espacios).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_suppliers_name_active
  ON public.suppliers (lower(trim(name)))
  WHERE is_active;

-- 3) Número de requisición único.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_purchase_requisitions_req_number
  ON public.purchase_requisitions (req_number)
  WHERE req_number IS NOT NULL AND req_number <> '';

-- 4) Código de material de catálogo único.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_materials_catalog_code
  ON public.materials_catalog (code)
  WHERE code IS NOT NULL AND code <> '';

-- 5) Impedir borrar un material que tenga movimientos o lotes (RESTRICT en vez de
--    CASCADE), como complemento al guardado de la app. Antes era ON DELETE CASCADE,
--    que borraba todo el historial en cadena.
ALTER TABLE public.inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_item_id_fkey;
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;

ALTER TABLE public.inventory_lots DROP CONSTRAINT IF EXISTS inventory_lots_item_id_fkey;
ALTER TABLE public.inventory_lots
  ADD CONSTRAINT inventory_lots_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;
