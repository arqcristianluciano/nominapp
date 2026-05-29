-- 051_payroll_item_created_by
-- Rastrea el AUTOR (created_by) de cada partida de mano de obra y de cada
-- factura de materiales, para saber quién introdujo cada renglón del reporte.
--
-- ADITIVO Y NO DISRUPTIVO:
--   * No modifica las políticas de escritura existentes (rls_write_*), que
--     siguen gobernadas por la capability `edit_payroll`. La restricción
--     "solo el autor o un Director" a nivel RLS queda como follow-up.
--   * Mismo patrón que projects.created_by (mig. 026/027): la columna lleva
--     DEFAULT auth.uid() y un trigger BEFORE INSERT como fallback por si el
--     cliente envía created_by NULL explícito.
--   * Las filas existentes quedan con created_by NULL (autor desconocido).

-- === Columnas ===
ALTER TABLE public.labor_line_items
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.labor_line_items
  ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE public.material_invoices
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.material_invoices
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Índices (útiles para futuros filtros / RLS por autor).
CREATE INDEX IF NOT EXISTS idx_labor_line_items_created_by
  ON public.labor_line_items(created_by);
CREATE INDEX IF NOT EXISTS idx_material_invoices_created_by
  ON public.material_invoices(created_by);

-- === Trigger fallback (BEFORE INSERT) ===
-- Si el cliente no setea created_by (o lo manda NULL), usa auth.uid().
CREATE OR REPLACE FUNCTION public.set_payroll_item_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.created_by IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_labor_line_items_created_by ON public.labor_line_items;
CREATE TRIGGER trg_labor_line_items_created_by
  BEFORE INSERT ON public.labor_line_items
  FOR EACH ROW EXECUTE FUNCTION public.set_payroll_item_created_by();

DROP TRIGGER IF EXISTS trg_material_invoices_created_by ON public.material_invoices;
CREATE TRIGGER trg_material_invoices_created_by
  BEFORE INSERT ON public.material_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_payroll_item_created_by();
