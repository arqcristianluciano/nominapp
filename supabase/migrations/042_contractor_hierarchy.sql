ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS parent_contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hierarchy_level integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_contractors_parent ON public.contractors(parent_contractor_id);
