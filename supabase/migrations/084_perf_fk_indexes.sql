-- =====================================================
-- NominApp - Migración 084: índices en llaves foráneas (velocidad)
-- Fecha: 2026-06-09
--
-- Problema detectado (auditoría de rendimiento de Supabase):
--   Cuatro columnas que apuntan a otras tablas (llaves foráneas) no tenían
--   índice. Sin índice, ciertas búsquedas y borrados en cascada recorren
--   toda la tabla, lo que se vuelve lento a medida que crecen los datos.
--
-- Solución:
--   Crear un índice por cada una. Es aditivo, no cambia datos ni lógica.
--
-- NOTAS: Idempotente (CREATE INDEX IF NOT EXISTS).
-- =====================================================

-- Préstamo -> cuenta bancaria desde la que se desembolsa
CREATE INDEX IF NOT EXISTS idx_contractor_loans_disbursement_account_id
  ON public.contractor_loans (disbursement_account_id);

-- Cuota de préstamo -> cuenta bancaria donde se cobra
CREATE INDEX IF NOT EXISTS idx_loan_installments_cuenta_cobro_id
  ON public.loan_installments (cuenta_cobro_id);

-- Renglón de requisición de compra -> categoría de presupuesto
CREATE INDEX IF NOT EXISTS idx_purchase_requisition_items_budget_category_id
  ON public.purchase_requisition_items (budget_category_id);

-- Tarea del cronograma -> tarea predecesora (dependencia)
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_predecessor_id
  ON public.schedule_tasks (predecessor_id);
