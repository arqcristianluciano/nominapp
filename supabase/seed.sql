-- =====================================================
-- ObraPRO - Seed Data
-- Datos reales de THE HOUSE & CO
-- =====================================================

-- EMPRESAS
INSERT INTO companies (id, name, rnc) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'THE HOUSE & CO LUCIANO SARKIS, S.R.L.', '1-32-66032-3'),
  ('c1000000-0000-0000-0000-000000000002', 'PLAYA ALICIA HOLDINGS, S.R.L.', '1-31-94439-6'),
  ('c1000000-0000-0000-0000-000000000003', 'THE HOUSE & CO 0970, S.R.L.', '1-31-79127-1'),
  ('c1000000-0000-0000-0000-000000000004', 'WFRONT S.R.L.', '1-32-01723-4'),
  ('c1000000-0000-0000-0000-000000000005', 'CORPORACIÓN SUERTEPAS, S.R.L.', NULL);

-- PROYECTOS
INSERT INTO projects (id, company_id, name, code, location, status, dt_percent, admin_percent, transport_percent) VALUES
  ('p1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'The Shore', 'SHORE', 'Calle La Playa, Sosúa', 'active', 10, 1, 0.5),
  ('p1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Arthouse Tower', 'ARTHOUSE', 'Santiago de los Caballeros', 'active', 10, 1, 0.5),
  ('p1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000003', 'El Spot', 'ELSPOT', 'Perla Marina, Sosúa', 'active', 10, 1, 0.5),
  ('p1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000004', 'Nomad', 'NOMAD', 'Sosúa', 'active', 10, 1, 0.5),
  ('p1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', 'Torre Grid 7', 'GRID7', 'Santiago de los Caballeros', 'active', 10, 1, 0.5);

-- CONTRATISTAS (de las nóminas de The Shore)
INSERT INTO contractors (name, specialty, payment_method) VALUES
  ('Rafael Medina', 'Acero de refuerzo (envarillado)', 'check'),
  ('Damas Eliazer', 'Blocks y pañete', 'check'),
  ('Blas Ovalles', 'Encofrado', 'check'),
  ('Kercima Moneluz', 'Excavación y perfilado', 'check'),
  ('Jerffry Almonte', 'Plomería', 'check'),
  ('José Marte', 'Electricidad', 'check'),
  ('Francisco Torres', 'Revestimiento de techos en yeso', 'check'),
  ('Elias Liz', 'Pintura general', 'check'),
  ('Pequeño', 'Pisos y baños de apartamentos', 'check'),
  ('Jonathan Genao', 'Closets y Denglas', 'check'),
  ('Yovani Pisero', 'Instalación de coralina', 'check'),
  ('Marcos Vásquez', 'Interconexión eléctrica EDENORTE', 'transfer'),
  ('Brauly Castaño', 'Ingeniero residente', 'cash'),
  ('Cocote', 'Pañete estriado', 'cash');

-- PROVEEDORES
INSERT INTO suppliers (name, rnc, payment_terms) VALUES
  ('Ferretería Llibre', '097-00065-7', 'Pago Transferencia'),
  ('Ferretería Luciano', NULL, 'Pago Cash'),
  ('Linares', NULL, 'Pago Cash'),
  ('JDL', NULL, 'Pago Transferencia'),
  ('SC Concretos', NULL, 'Pago Transferencia'),
  ('Concreto del Cibao', NULL, 'Pago Transferencia'),
  ('Severco', NULL, 'Pago Transferencia'),
  ('PANAM', NULL, 'Pago Transferencia'),
  ('Marmotech', NULL, 'Pago Transferencia'),
  ('Stone House', NULL, 'Pago Cash'),
  ('Plomería Villa', NULL, 'Pago Cash'),
  ('Floor Factory', NULL, 'Pago Transferencia'),
  ('Procontratista', NULL, 'Pago Transferencia'),
  ('La Iberica', NULL, 'Pago Cash'),
  ('Cayaya (Puertas y Ventanas)', NULL, 'Pago Transferencia'),
  ('Altice', NULL, 'Pago Transferencia'),
  ('EDENORTE', NULL, 'Pago Transferencia');

-- CUENTAS BANCARIAS
INSERT INTO bank_accounts (owner_name, bank_name, account_number, account_type, cedula_rnc, is_internal) VALUES
  ('Cristian Luciano Sarkis', 'Popular', '832073613', 'corriente', '031-0479200-1', true),
  ('Roni Hidalgo', 'Popular', '832335053', 'corriente', '047-0208407-2', true),
  ('Cristian Luciano Sarkis', 'Banreservas', '9600781508', 'corriente', '031-0479200-1', true),
  ('Ferretería Llibre', 'Popular', '761165364', 'corriente', '097-00065-7', false),
  ('Concreto del Cibao', 'Banreservas', '9606398410', 'corriente', NULL, false);
