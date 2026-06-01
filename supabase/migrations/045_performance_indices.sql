-- 042_performance_indices.sql
-- Adds missing indices on hot-path multi-tenant queries.
-- All statements are idempotent (CREATE INDEX IF NOT EXISTS).
--
-- Note on scope:
--  * transactions(project_id, date DESC)        -> already exists as idx_transactions_project_date
--  * attendance_records(project_id, date DESC)  -> already exists as idx_attendance_project_date
--  * bitacora_entries(project_id, date DESC)    -> already exists as idx_bitacora_project_date
--  * purchase_orders(project_id) and (status)   -> already exist individually
--  * material_invoices has no project_id/invoice_date columns (joins via payroll_period_id) -> skipped
--  * purchase_orders has no company_id column                                                 -> skipped
--  * quality_control uses pour_date (no `date` column)                                        -> mapped accordingly
-- Indices below cover the remaining gaps.

-- payroll_periods: list/sort by project + most recent report date
CREATE INDEX IF NOT EXISTS idx_payroll_periods_project_report_date
  ON public.payroll_periods (project_id, report_date DESC);

-- purchase_orders: composite (project_id, status) for filtered listings per project
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project_status
  ON public.purchase_orders (project_id, status);

-- quality_control: list/sort by project + pour_date
CREATE INDEX IF NOT EXISTS idx_quality_control_project_pour_date
  ON public.quality_control (project_id, pour_date DESC);
