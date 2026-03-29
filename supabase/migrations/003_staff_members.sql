-- Staff members for "Reportado por" dropdown
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default staff
INSERT INTO staff_members (name, role) VALUES
  ('Ing. Roni Hidalgo', 'Ingeniero residente'),
  ('Ing. Cristian Luciano', 'Director de proyecto');
