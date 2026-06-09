-- 086_quote_item_received_not_exceed_ordered
-- R2/N7: candado de servidor para que la cantidad recibida de una linea nunca
-- supere la cantidad pedida, incluso si dos personas reciben al mismo tiempo.
ALTER TABLE public.purchase_quote_items
  DROP CONSTRAINT IF EXISTS chk_received_not_exceed_ordered;
ALTER TABLE public.purchase_quote_items
  ADD CONSTRAINT chk_received_not_exceed_ordered
  CHECK (received_quantity IS NULL OR received_quantity <= quantity + 1e-6);
