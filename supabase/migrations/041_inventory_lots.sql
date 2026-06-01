CREATE TABLE IF NOT EXISTS public.inventory_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  lot_number text,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity numeric(15,4) NOT NULL DEFAULT 0,
  unit_cost numeric(15,4),
  expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_movements ADD COLUMN IF NOT EXISTS lot_id uuid REFERENCES public.inventory_lots(id);
CREATE INDEX IF NOT EXISTS idx_inventory_lots_item ON public.inventory_lots(item_id);
ALTER TABLE public.inventory_lots ENABLE ROW LEVEL SECURITY;
-- RLS: SELECT abierto autenticado, WRITE para quien tenga inventory_write capability.
CREATE POLICY "rls_select_inventory_lots" ON public.inventory_lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "rls_write_inventory_lots" ON public.inventory_lots FOR ALL TO authenticated
  USING (public.user_has_capability((SELECT project_id FROM public.inventory_items WHERE id = item_id), 'inventory_write'))
  WITH CHECK (public.user_has_capability((SELECT project_id FROM public.inventory_items WHERE id = item_id), 'inventory_write'));
