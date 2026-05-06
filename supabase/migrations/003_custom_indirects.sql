-- Permite agregar gastos indirectos personalizados por proyecto
-- Cada item del JSON: { id: string, name: string, type: 'percent'|'fixed', value: number }
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS custom_indirects JSONB NOT NULL DEFAULT '[]'::jsonb;
