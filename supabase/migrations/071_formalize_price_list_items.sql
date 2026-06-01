-- 060_formalize_price_list_items.sql
-- Formalize the creation of price_list_items as a migration.
--
-- Historically this table existed only in the consolidated supabase-schema.sql
-- and never in a numbered migration, which is how its category CHECK constraint
-- silently drifted (see migration 050). This migration makes the migration set
-- a complete source of truth for the table.
--
-- Idempotent: on environments where the table already exists (e.g. production)
-- this is a no-op for the table itself. The CHECK constraint is (re)asserted to
-- the full category set so a migration-only bootstrap matches migration 050.

CREATE TABLE IF NOT EXISTS public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  code text,
  description text not null,
  unit text not null,
  unit_price numeric(15,2) not null default 0
);

ALTER TABLE public.price_list_items
  DROP CONSTRAINT IF EXISTS price_list_items_category_check;

ALTER TABLE public.price_list_items
  ADD CONSTRAINT price_list_items_category_check
  CHECK (category IN ('material', 'labor', 'equipment', 'adjustment'));
