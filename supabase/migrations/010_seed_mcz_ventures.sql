-- =====================================================
-- NominApp - Migración 010: Empresa faltante MCZ Ventures
-- Seed actualizado para incluir la 6ª empresa del grupo
-- (vehículo Torre Grid 7) — sección 1 del estado deseado.
-- Idempotente: si ya existe por RNC, no duplica.
-- =====================================================

INSERT INTO companies (id, name, rnc)
SELECT
  'c1000000-0000-0000-0000-000000000006'::uuid,
  'MCZ VENTURES, S.R.L.',
  '1-32-76438-2'
WHERE NOT EXISTS (
  SELECT 1 FROM companies WHERE rnc = '1-32-76438-2'
);

-- Si Torre Grid 7 está asignado a otra empresa, conviene reasignarlo
-- manualmente en producción; aquí no movemos el FK para no romper datos.
