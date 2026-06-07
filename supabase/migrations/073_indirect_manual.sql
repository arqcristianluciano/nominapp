-- 073_indirect_manual.sql
-- Punto 2 (Reporte Junio 2026): gasto indirecto MANUAL de monto fijo.
--
-- Hasta ahora los gastos indirectos se recalculaban siempre desde la
-- configuracion del proyecto (porcentajes sobre la base), borrando e
-- reinsertando las filas en cada cambio. Eso impedia anadir un indirecto
-- puntual de monto fijo, porque se perdia al recalcular.
--
-- `is_manual = true` marca las filas creadas a mano: el recalculo de los
-- porcentuales NO las toca y su monto se conserva tal cual.
--
-- Columna nueva NOT NULL con DEFAULT false: las filas existentes quedan
-- marcadas como NO manuales (automaticas), que es justo lo correcto. No
-- rompe datos existentes.

ALTER TABLE public.indirect_costs
  ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false;
