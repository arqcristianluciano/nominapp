-- =====================================================
-- NominApp - Migración 076: solicitudes multi-línea + archivo cotización
-- -----------------------------------------------------
-- (4) VARIAS LÍNEAS: tabla purchase_requisition_items
--     Una solicitud puede cubrir varios materiales. Cada línea
--     mantiene su propia imputación a partida/capítulo y permite
--     calcular "planificado / disponible" por línea.
-- (5) BOTÓN EDITAR: se controla en la aplicación (estados draft /
--     quoting / needs_revision). No requiere cambio de esquema.
-- (6) ADJUNTAR COTIZACIÓN: el campo purchase_quotes.attachment_path
--     ya existe desde la migración 007. Esta migración crea el bucket
--     'quote-attachments' y sus políticas RLS (equivalente al bucket
--     'receipt-attachments' de la migración 062).
-- =====================================================

-- =====================================================
-- PARTE 1 — Tabla hija de ítems de solicitud
-- =====================================================

CREATE TABLE IF NOT EXISTS public.purchase_requisition_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id        UUID NOT NULL
                          REFERENCES public.purchase_requisitions(id)
                          ON DELETE CASCADE,
  description           TEXT NOT NULL,
  budget_category_id    UUID REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  budget_item_id        UUID REFERENCES public.budget_items(id)      ON DELETE SET NULL,
  resource_type         TEXT CHECK (
                          resource_type IS NULL
                          OR resource_type IN ('material','labor','equipment','other')
                        ),
  quantity              NUMERIC(15,4) NOT NULL DEFAULT 0,
  unit                  TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pri_requisition
  ON public.purchase_requisition_items(requisition_id);

CREATE INDEX IF NOT EXISTS idx_pri_budget_item
  ON public.purchase_requisition_items(budget_item_id);

COMMENT ON TABLE public.purchase_requisition_items IS
  'Líneas de material de una solicitud de compra. Soporta múltiples materiales por solicitud (multi-línea). Migración 076.';

COMMENT ON COLUMN public.purchase_requisition_items.budget_item_id IS
  'Partida del presupuesto a la que se imputa esta línea (opcional). Permite calcular disponible por línea.';

-- =====================================================
-- PARTE 2 — Migración de datos
-- MUEVE el material único de cada solicitud existente a su
-- primera línea en purchase_requisition_items.
-- Se ejecuta solo donde description no es nulo/vacío.
-- Las solicitudes sin cantidad (quantity_requested IS NULL) se
-- insertan con quantity = 0 para no romper el NOT NULL.
-- =====================================================

INSERT INTO public.purchase_requisition_items
  (requisition_id, description, budget_category_id, budget_item_id,
   resource_type, quantity, unit, sort_order)
SELECT
  id,
  description,
  budget_category_id,
  budget_item_id,
  resource_type,
  COALESCE(quantity_requested, 0),
  unit,
  0
FROM public.purchase_requisitions
WHERE description IS NOT NULL AND description <> '';

-- =====================================================
-- PARTE 3 — RLS de la nueva tabla
-- La capability que protege la tabla padre (purchase_requisitions)
-- ya usa 'create_requisition', replicamos el mismo patrón.
-- =====================================================

ALTER TABLE public.purchase_requisition_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pri_select_member" ON public.purchase_requisition_items;
CREATE POLICY "pri_select_member" ON public.purchase_requisition_items
  FOR SELECT TO authenticated
  USING (
    public.current_user_can_access_project(
      (SELECT project_id FROM public.purchase_requisitions
       WHERE id = purchase_requisition_items.requisition_id)
    )
  );

DROP POLICY IF EXISTS "pri_write_requisition" ON public.purchase_requisition_items;
CREATE POLICY "pri_write_requisition" ON public.purchase_requisition_items
  FOR ALL TO authenticated
  USING (
    public.user_has_any_capability(
      (SELECT project_id FROM public.purchase_requisitions
       WHERE id = purchase_requisition_items.requisition_id),
      'create_requisition', 'load_quotes', 'approve_excess',
      'release_purchase_order', 'receive_order'
    )
  )
  WITH CHECK (
    public.user_has_any_capability(
      (SELECT project_id FROM public.purchase_requisitions
       WHERE id = purchase_requisition_items.requisition_id),
      'create_requisition', 'load_quotes', 'approve_excess',
      'release_purchase_order', 'receive_order'
    )
  );

-- =====================================================
-- PARTE 4 — Bucket para adjuntos de cotización
-- Bucket 'quote-attachments' privado, con path
-- <projectId>/<requisitionId>/<quoteId>/<filename>
-- SELECT: miembro del proyecto
-- INSERT/UPDATE/DELETE: quien pueda cargar cotizaciones
--   (capability 'load_quotes')
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-attachments', 'quote-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "quote_attachments_select_member" ON storage.objects;
CREATE POLICY "quote_attachments_select_member" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'quote-attachments'
    AND public.current_user_can_access_project(
          ((storage.foldername(name))[1])::uuid
        )
  );

DROP POLICY IF EXISTS "quote_attachments_insert_load" ON storage.objects;
CREATE POLICY "quote_attachments_insert_load" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'quote-attachments'
    AND public.user_has_capability(
          ((storage.foldername(name))[1])::uuid,
          'load_quotes'
        )
  );

DROP POLICY IF EXISTS "quote_attachments_update_load" ON storage.objects;
CREATE POLICY "quote_attachments_update_load" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'quote-attachments'
    AND public.user_has_capability(
          ((storage.foldername(name))[1])::uuid,
          'load_quotes'
        )
  )
  WITH CHECK (
    bucket_id = 'quote-attachments'
    AND public.user_has_capability(
          ((storage.foldername(name))[1])::uuid,
          'load_quotes'
        )
  );

DROP POLICY IF EXISTS "quote_attachments_delete_load" ON storage.objects;
CREATE POLICY "quote_attachments_delete_load" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'quote-attachments'
    AND public.user_has_capability(
          ((storage.foldername(name))[1])::uuid,
          'load_quotes'
        )
  );
