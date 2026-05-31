-- 058_index_purchase_requisitions_approved_quote
-- Rendimiento: agrega el índice que faltaba sobre la cotización aprobada de las
-- requisiciones de compra (purchase_requisitions.approved_quote_id). Acelera los
-- cruces por esa relación. No cambia datos ni permisos. Idempotente.
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_approved_quote_id
  ON public.purchase_requisitions (approved_quote_id);
