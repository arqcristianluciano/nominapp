-- 050_price_list_allow_adjustment.sql
-- Allow the 'adjustment' category in price_list_items.
--
-- BUG: The live CHECK constraint on price_list_items.category had drifted to
--   CHECK (category IN ('material','labor','equipment'))
-- omitting 'adjustment'. The UI (PriceListInlineForm) offers four categories
-- (Material, Mano de obra, Equipo, Ajuste), but inserting an "Ajuste" row
-- violated the constraint. The error was swallowed client-side, so the price
-- silently failed to save. The consolidated supabase-schema.sql already lists
-- all four categories; this migration realigns the live database.
--
-- Idempotent: drops and recreates the constraint with the full set of values.

ALTER TABLE public.price_list_items
  DROP CONSTRAINT IF EXISTS price_list_items_category_check;

ALTER TABLE public.price_list_items
  ADD CONSTRAINT price_list_items_category_check
  CHECK (category IN ('material', 'labor', 'equipment', 'adjustment'));
