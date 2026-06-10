-- 089_measure_units_catalog
-- Catálogo de unidades de medida editable por el usuario.
--
-- Antes las unidades (M², Unidad, Día, etc.) estaban fijas en el código y no
-- se podían añadir nuevas como "Atado", "Libra" o "Quintal". Esta tabla
-- guarda el catálogo en la base de datos: la app la lee para llenar las
-- listas desplegables y permite registrar unidades nuevas que quedan
-- disponibles para todos.
--
-- `code` es el valor que se guarda en las columnas `unit` (texto libre) de
-- presupuesto, solicitudes de compra, nómina y lista de precios; `label` es
-- lo que ve el usuario. Para unidades añadidas por el usuario ambos coinciden.

CREATE TABLE IF NOT EXISTS public.measure_units (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL,
  label      text NOT NULL,
  sort_order integer NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Único sin distinguir mayúsculas: evita "Libra" y "libra" duplicadas.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_measure_units_code
  ON public.measure_units (lower(code));

ALTER TABLE public.measure_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users full access" ON public.measure_units;
CREATE POLICY "Authenticated users full access"
  ON public.measure_units
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Semilla: las unidades que ya usaba la app (constante MEASURE_UNITS y las
-- opciones extra de presupuesto/lista de precios), más las pedidas por el
-- usuario (Atado, Libra; Quintal ya existe como QQ).
INSERT INTO public.measure_units (code, label, sort_order) VALUES
  ('M2',       'M²',             10),
  ('ML',       'ML',             20),
  ('MT2',      'MT²',            30),
  ('MT3',      'MT³',            40),
  ('M3',       'M³',             50),
  ('UD',       'Unidad',         60),
  ('PA',       'Partida alzada', 70),
  ('DIA',      'Día',            80),
  ('SEMANAS',  'Semanas',        90),
  ('QUINCENA', 'Quincena',      100),
  ('AVANCE',   'Avance',        110),
  ('AVANZADO', 'Avanzado',      120),
  ('SALDO',    'Saldo',         130),
  ('FACTURA',  'Factura',       140),
  ('VISITAS',  'Visitas',       150),
  ('TOTAL',    'Total',         160),
  ('Saco',     'Saco',          170),
  ('QQ',       'Quintal',       180),
  ('Global',   'Global',        190),
  ('Punto',    'Punto',         200),
  ('Mes',      'Mes',           210),
  ('Atado',    'Atado',         220),
  ('Libra',    'Libra',         230)
ON CONFLICT DO NOTHING;
