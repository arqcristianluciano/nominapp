-- Migration 058: Mantener material_invoices.amount = suma de sus items
--
-- Integridad de datos: ante cualquier cambio en material_invoice_items, el
-- total denormalizado del encabezado (material_invoices.amount) se recalcula
-- automáticamente. La app ya lo mantiene al crear/editar; este trigger lo
-- blinda frente a ediciones directas en BD u otras vías. No reconcilia filas
-- existentes (el backfill de la migración 051 ya las dejó consistentes).

CREATE OR REPLACE FUNCTION public.recompute_material_invoice_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.material_invoices mi
    SET amount = COALESCE(
      (SELECT SUM(amount) FROM public.material_invoice_items WHERE material_invoice_id = OLD.material_invoice_id),
      0
    )
    WHERE mi.id = OLD.material_invoice_id;
    RETURN OLD;
  END IF;

  UPDATE public.material_invoices mi
  SET amount = COALESCE(
    (SELECT SUM(amount) FROM public.material_invoice_items WHERE material_invoice_id = NEW.material_invoice_id),
    0
  )
  WHERE mi.id = NEW.material_invoice_id;

  -- Si un item se movió de factura (raro), recalcula también la anterior.
  IF (TG_OP = 'UPDATE' AND NEW.material_invoice_id IS DISTINCT FROM OLD.material_invoice_id) THEN
    UPDATE public.material_invoices mi
    SET amount = COALESCE(
      (SELECT SUM(amount) FROM public.material_invoice_items WHERE material_invoice_id = OLD.material_invoice_id),
      0
    )
    WHERE mi.id = OLD.material_invoice_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_material_invoice_amount ON public.material_invoice_items;
CREATE TRIGGER trg_recompute_material_invoice_amount
AFTER INSERT OR UPDATE OR DELETE ON public.material_invoice_items
FOR EACH ROW EXECUTE FUNCTION public.recompute_material_invoice_amount();
