-- Widen sort_order columns from INTEGER to BIGINT.
-- Date.now() values (13-digit ms timestamps) exceed int4 range and caused
-- "integer out of range" errors when inserting budget_items.
-- BIGINT is a superset of INTEGER; existing data is preserved untouched.

ALTER TABLE budget_items     ALTER COLUMN sort_order TYPE bigint;
ALTER TABLE budget_categories ALTER COLUMN sort_order TYPE bigint;
ALTER TABLE contract_partidas ALTER COLUMN sort_order TYPE bigint;
ALTER TABLE labor_line_items  ALTER COLUMN sort_order TYPE bigint;
