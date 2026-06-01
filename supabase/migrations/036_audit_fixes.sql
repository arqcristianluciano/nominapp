-- Migration 033: Audit fixes
--
-- Addresses findings from the schema/data integrity audit:
--   1. Race condition on `cut_number` per contract in contract_cortes.
--   2. Missing `due_date` on transactions (CxP currently falls back to
--      transaction.date for vencimiento, which is incorrect).
--   3. Missing indexes on inventory_movements and transactions used by
--      historical / CxP-per-project reports.
--
-- NOTE: tables such as `adjustment_contracts`, `contract_partidas`,
-- `contractor_loans`, `contract_cortes`, `contract_adelantos`,
-- `contract_cubications`, `contractor_documents`, `expected_cash_inflows`,
-- `indirect_costs`, `inventory_movements`, `labor_line_items`,
-- `loan_deductions`, `material_invoices`, `materials_catalog`,
-- `mercado_budgets`, `mercado_budget_lines`, `partida_progress`,
-- `payment_distributions`, `payroll_periods`, `price_list_items`,
-- `purchase_orders`, `purchase_order_items`, `purchase_quotes`,
-- `purchase_quote_items`, `purchase_requisitions`, `quality_control`,
-- `schedule_tasks`, `bitacora_entries`, etc., already exist in the prod
-- database (verified via information_schema.tables on project
-- pkllcsexipdvwdpunlkz on 2026-05-21). Their CREATE TABLE statements live
-- in the legacy `supabase-schema.sql` bootstrap and are not reproduced as
-- numbered migrations in this repo. This migration only adds the deltas
-- listed above; it does not (re)create those tables.

BEGIN;

-- 1) UNIQUE constraint on (contract_id, cut_number) to prevent duplicate
--    cut numbers per contract under concurrent inserts.
--    Postgres does not support `ADD CONSTRAINT IF NOT EXISTS`, so guard
--    with a catalog lookup.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.contract_cortes'::regclass
      AND conname  = 'contract_cortes_unique_cut_number'
  ) THEN
    ALTER TABLE public.contract_cortes
      ADD CONSTRAINT contract_cortes_unique_cut_number
      UNIQUE (contract_id, cut_number);
  END IF;
END $$;

-- 2) transactions.due_date: real payable due date (separate from the
--    invoice/transaction date).
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS due_date date;

-- 3) inventory_movements indexes for item history and per-project reports.
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created_at
  ON public.inventory_movements (item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_project_created_at
  ON public.inventory_movements (project_id, created_at DESC);

-- 4) transactions index for CxP queries scoped by project + date.
CREATE INDEX IF NOT EXISTS idx_transactions_project_date
  ON public.transactions (project_id, date DESC);

COMMIT;
