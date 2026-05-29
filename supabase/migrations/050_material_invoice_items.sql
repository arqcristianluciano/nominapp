-- Migration 050: Items por factura de materiales + comprobante (imagen/PDF)
--
-- Hasta ahora una factura de materiales (`material_invoices`) era una sola
-- linea: proveedor + descripcion + monto. Este cambio permite que UNA factura
-- agrupe VARIOS items (descripcion + monto) y que se adjunte un comprobante
-- (imagen o PDF) en el bucket privado `invoice-attachments`.
--
-- Modelo:
--   material_invoices       = encabezado (proveedor, referencia, comprobante).
--                             `amount` se mantiene como el TOTAL de la factura
--                             (suma de sus items) y `description` como un
--                             resumen, para NO romper reportes/impresion/export
--                             que ya leen esas columnas.
--   material_invoice_items  = detalle (descripcion + monto) de cada factura.
--
-- Convencion de storage:
--   El path del comprobante DEBE ser `<project_uuid>/<...>`; el primer segmento
--   identifica el proyecto. RLS exige capacidad `edit_payroll` sobre ese
--   proyecto para escribir, y acceso al proyecto para leer.

BEGIN;

-- 1) Tabla de items de factura de materiales.
CREATE TABLE IF NOT EXISTS public.material_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_invoice_id uuid NOT NULL
    REFERENCES public.material_invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(15,2) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_invoice_items_invoice_id
  ON public.material_invoice_items (material_invoice_id);

COMMENT ON TABLE public.material_invoice_items IS
  'Items (descripcion + monto) que componen una factura de materiales. El total de la factura se mantiene denormalizado en material_invoices.amount.';

-- 2) Helper: proyecto al que pertenece una factura de materiales.
CREATE OR REPLACE FUNCTION public._project_of_material_invoice(p_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public._project_of_payroll(payroll_period_id)
  FROM public.material_invoices WHERE id = p_id;
$$;

-- 3) RLS para material_invoice_items: misma capacidad que la factura (edit_payroll).
ALTER TABLE public.material_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.material_invoice_items;
CREATE POLICY "rls_select_authenticated" ON public.material_invoice_items
  FOR SELECT TO authenticated
  USING (
    public.current_user_is_director()
    OR EXISTS (
      SELECT 1
      FROM public.material_invoices mi
      JOIN public.payroll_periods pp ON pp.id = mi.payroll_period_id
      WHERE mi.id = material_invoice_items.material_invoice_id
        AND public.is_member_of_project(pp.project_id)
    )
  );

DROP POLICY IF EXISTS "rls_write_material_invoice_items" ON public.material_invoice_items;
CREATE POLICY "rls_write_material_invoice_items" ON public.material_invoice_items
  FOR ALL TO authenticated
  USING (public.user_has_capability(public._project_of_material_invoice(material_invoice_id), 'edit_payroll'))
  WITH CHECK (public.user_has_capability(public._project_of_material_invoice(material_invoice_id), 'edit_payroll'));

-- 4) Backfill: cada factura existente se convierte en un item (preserva historico).
INSERT INTO public.material_invoice_items (material_invoice_id, description, amount, sort_order)
SELECT mi.id, mi.description, mi.amount, 0
FROM public.material_invoices mi
WHERE NOT EXISTS (
  SELECT 1 FROM public.material_invoice_items it
  WHERE it.material_invoice_id = mi.id
);

-- 5) Bucket privado para comprobantes de facturas + RLS.
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-attachments', 'invoice-attachments', false)
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.material_invoices.attachment_path IS
  'Path dentro del bucket invoice-attachments (e.g. <project_id>/...). NULL si la factura aun no tiene comprobante adjunto.';

DROP POLICY IF EXISTS "invoice_attachments_select_member_or_director" ON storage.objects;
DROP POLICY IF EXISTS "invoice_attachments_insert_payroll_editor" ON storage.objects;
DROP POLICY IF EXISTS "invoice_attachments_update_payroll_editor" ON storage.objects;
DROP POLICY IF EXISTS "invoice_attachments_delete_payroll_editor" ON storage.objects;

-- SELECT: miembros del proyecto y directores pueden leer cualquier comprobante.
CREATE POLICY "invoice_attachments_select_member_or_director"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'invoice-attachments'
  AND public.current_user_can_access_project(((storage.foldername(name))[1])::uuid)
);

-- INSERT: solo quien puede editar nomina en ese proyecto.
CREATE POLICY "invoice_attachments_insert_payroll_editor"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'invoice-attachments'
  AND public.user_has_capability(((storage.foldername(name))[1])::uuid, 'edit_payroll')
);

-- UPDATE: mismo alcance que insert (upsert/overwrite desde el cliente).
CREATE POLICY "invoice_attachments_update_payroll_editor"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'invoice-attachments'
  AND public.user_has_capability(((storage.foldername(name))[1])::uuid, 'edit_payroll')
)
WITH CHECK (
  bucket_id = 'invoice-attachments'
  AND public.user_has_capability(((storage.foldername(name))[1])::uuid, 'edit_payroll')
);

-- DELETE: solo quien puede editar nomina en ese proyecto.
CREATE POLICY "invoice_attachments_delete_payroll_editor"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'invoice-attachments'
  AND public.user_has_capability(((storage.foldername(name))[1])::uuid, 'edit_payroll')
);

COMMIT;
