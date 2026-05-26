-- Migration 047: Foreign-key & referential-integrity fixes
--
-- Addresses missing referential integrity found in the schema audit of
-- project pkllcsexipdvwdpunlkz (verified 2026-05-26):
--
--   1. purchase_requisitions.approved_quote_id (uuid) had no FK to
--      purchase_quotes(id). 0 orphan rows confirmed -> safe to add with
--      ON DELETE SET NULL (clearing the approved quote when the quote row
--      is deleted preserves the requisition).
--
--   2. approvals.actor_user_id (TEXT) and push_subscriptions.user_id (TEXT)
--      both reference auth.users(id) (uuid). These are NOT converted to
--      foreign keys: app tables intentionally avoid FKs into the Supabase
--      `auth` schema (auth rows are managed by GoTrue, cross-schema FKs to
--      auth.users complicate user deletion and are discouraged). There is
--      also a TYPE MISMATCH (text vs uuid) that would require a column
--      rewrite to FK directly. Instead we document the intent via COLUMN
--      COMMENTs and add a CHECK enforcing valid uuid text format.
--      Format violations verified zero before adding:
--        approvals.actor_user_id: 0 of 9 rows invalid.
--        push_subscriptions.user_id: 0 of 0 rows invalid (empty table).
--
-- Postgres does not support `ADD CONSTRAINT IF NOT EXISTS`, so each
-- constraint is guarded by a pg_constraint catalog lookup in a DO block
-- (same pattern as migration 033). Idempotent and safe to re-run.
--
-- NOTE: tables `purchase_requisitions`, `purchase_quotes`, `approvals`,
-- and `push_subscriptions` already exist in the prod database (their
-- CREATE TABLE statements live in the legacy bootstrap schema, not as
-- numbered migrations). This migration only adds the constraints/comments
-- described above.

BEGIN;

-- 1) purchase_requisitions.approved_quote_id -> purchase_quotes(id)
--    uuid -> uuid, 0 orphans, ON DELETE SET NULL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.purchase_requisitions'::regclass
      AND conname  = 'purchase_requisitions_approved_quote_id_fkey'
  ) THEN
    ALTER TABLE public.purchase_requisitions
      ADD CONSTRAINT purchase_requisitions_approved_quote_id_fkey
      FOREIGN KEY (approved_quote_id)
      REFERENCES public.purchase_quotes (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2) approvals.actor_user_id: documented non-FK to auth.users + uuid CHECK.
--    NULL allowed (column is nullable).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.approvals'::regclass
      AND conname  = 'approvals_actor_user_id_uuid_format_check'
  ) THEN
    ALTER TABLE public.approvals
      ADD CONSTRAINT approvals_actor_user_id_uuid_format_check
      CHECK (
        actor_user_id IS NULL
        OR actor_user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      );
  END IF;
END $$;

COMMENT ON COLUMN public.approvals.actor_user_id IS
  'References auth.users(id), stored as text. Intentionally NOT a foreign key: app tables avoid FKs into the Supabase auth schema (rows managed by GoTrue) and the column type is text vs auth.users.id uuid. Valid uuid format enforced via approvals_actor_user_id_uuid_format_check.';

-- 3) push_subscriptions.user_id: documented non-FK to auth.users + uuid CHECK.
--    Column is NOT NULL, so no NULL branch in the CHECK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.push_subscriptions'::regclass
      AND conname  = 'push_subscriptions_user_id_uuid_format_check'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_id_uuid_format_check
      CHECK (
        user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      );
  END IF;
END $$;

COMMENT ON COLUMN public.push_subscriptions.user_id IS
  'References auth.users(id), stored as text. Intentionally NOT a foreign key: app tables avoid FKs into the Supabase auth schema (rows managed by GoTrue) and the column type is text vs auth.users.id uuid. Valid uuid format enforced via push_subscriptions_user_id_uuid_format_check.';

COMMIT;
