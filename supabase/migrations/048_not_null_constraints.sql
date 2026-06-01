-- 045_not_null_constraints.sql
-- Data-integrity: enforce NOT NULL on tenancy columns and created_at columns.
--
-- Audit of project pkllcsexipdvwdpunlkz confirmed ZERO current violations for
-- every column below (re-verified immediately before authoring this migration),
-- so enforcement is safe.
--
-- NOT NULL is naturally idempotent (re-running is a no-op once enforced).
-- For created_at columns we also set a DEFAULT now() and run a safety-net UPDATE
-- to backfill any rows that might appear between audit and apply time.

BEGIN;

-- ---------------------------------------------------------------------------
-- Tenancy columns: must always reference an owning parent (no default).
-- ---------------------------------------------------------------------------
ALTER TABLE projects        ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE bank_accounts   ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE purchase_orders ALTER COLUMN project_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- created_at columns: default to now(), backfill (safety net), enforce NOT NULL.
-- ---------------------------------------------------------------------------

-- transactions
ALTER TABLE transactions ALTER COLUMN created_at SET DEFAULT now();
UPDATE transactions SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE transactions ALTER COLUMN created_at SET NOT NULL;

-- payroll_periods
ALTER TABLE payroll_periods ALTER COLUMN created_at SET DEFAULT now();
UPDATE payroll_periods SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE payroll_periods ALTER COLUMN created_at SET NOT NULL;

-- purchase_orders
ALTER TABLE purchase_orders ALTER COLUMN created_at SET DEFAULT now();
UPDATE purchase_orders SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE purchase_orders ALTER COLUMN created_at SET NOT NULL;

-- companies
ALTER TABLE companies ALTER COLUMN created_at SET DEFAULT now();
UPDATE companies SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE companies ALTER COLUMN created_at SET NOT NULL;

-- projects
ALTER TABLE projects ALTER COLUMN created_at SET DEFAULT now();
UPDATE projects SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE projects ALTER COLUMN created_at SET NOT NULL;

-- contractors
ALTER TABLE contractors ALTER COLUMN created_at SET DEFAULT now();
UPDATE contractors SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE contractors ALTER COLUMN created_at SET NOT NULL;

-- suppliers
ALTER TABLE suppliers ALTER COLUMN created_at SET DEFAULT now();
UPDATE suppliers SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE suppliers ALTER COLUMN created_at SET NOT NULL;

-- inventory_items
ALTER TABLE inventory_items ALTER COLUMN created_at SET DEFAULT now();
UPDATE inventory_items SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE inventory_items ALTER COLUMN created_at SET NOT NULL;

-- inventory_movements
ALTER TABLE inventory_movements ALTER COLUMN created_at SET DEFAULT now();
UPDATE inventory_movements SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE inventory_movements ALTER COLUMN created_at SET NOT NULL;

-- contract_adelantos
ALTER TABLE contract_adelantos ALTER COLUMN created_at SET DEFAULT now();
UPDATE contract_adelantos SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE contract_adelantos ALTER COLUMN created_at SET NOT NULL;

-- contract_cortes
ALTER TABLE contract_cortes ALTER COLUMN created_at SET DEFAULT now();
UPDATE contract_cortes SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE contract_cortes ALTER COLUMN created_at SET NOT NULL;

-- contractor_loans
ALTER TABLE contractor_loans ALTER COLUMN created_at SET DEFAULT now();
UPDATE contractor_loans SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE contractor_loans ALTER COLUMN created_at SET NOT NULL;

-- contractor_documents
ALTER TABLE contractor_documents ALTER COLUMN created_at SET DEFAULT now();
UPDATE contractor_documents SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE contractor_documents ALTER COLUMN created_at SET NOT NULL;

-- loan_deductions
ALTER TABLE loan_deductions ALTER COLUMN created_at SET DEFAULT now();
UPDATE loan_deductions SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE loan_deductions ALTER COLUMN created_at SET NOT NULL;

-- attendance_records
ALTER TABLE attendance_records ALTER COLUMN created_at SET DEFAULT now();
UPDATE attendance_records SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE attendance_records ALTER COLUMN created_at SET NOT NULL;

-- bitacora_entries
ALTER TABLE bitacora_entries ALTER COLUMN created_at SET DEFAULT now();
UPDATE bitacora_entries SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE bitacora_entries ALTER COLUMN created_at SET NOT NULL;

-- schedule_tasks
ALTER TABLE schedule_tasks ALTER COLUMN created_at SET DEFAULT now();
UPDATE schedule_tasks SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE schedule_tasks ALTER COLUMN created_at SET NOT NULL;

-- adjustment_contracts
ALTER TABLE adjustment_contracts ALTER COLUMN created_at SET DEFAULT now();
UPDATE adjustment_contracts SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE adjustment_contracts ALTER COLUMN created_at SET NOT NULL;

-- purchase_requisitions
ALTER TABLE purchase_requisitions ALTER COLUMN created_at SET DEFAULT now();
UPDATE purchase_requisitions SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE purchase_requisitions ALTER COLUMN created_at SET NOT NULL;

COMMIT;
