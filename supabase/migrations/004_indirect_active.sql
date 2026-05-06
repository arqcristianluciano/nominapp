-- Permite activar/desactivar gastos indirectos por nómina
-- Si is_active = false, el costo queda guardado pero no suma al total_indirect
ALTER TABLE indirect_costs
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
