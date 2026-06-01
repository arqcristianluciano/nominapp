-- =====================================================================
-- 028 - Admin: roles, capabilities, datos del empleado
-- ---------------------------------------------------------------------
-- Mueve la matriz de permisos de codigo a BD para que el Director General
-- pueda editarla desde la UI. Tres tablas nuevas:
--
--   roles            - los 8 roles del sistema + roles personalizados.
--   capabilities     - catalogo de acciones del sistema (~40 entradas).
--   role_capabilities- M2M, define que puede hacer cada rol.
--
-- Tambien extiende user_profiles con datos del empleado (nombre, cedula,
-- telefono, puesto, salario, cuenta bancaria) y crea user_documents para
-- adjuntar copia de cedula / contrato.
--
-- Migracion 029 reemplaza las policies por chequeo de capabilities en
-- lugar de slugs de rol, para que las ediciones de matriz tomen efecto
-- en BD.
-- =====================================================================

-- =====================================================================
-- Roles
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  is_director boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.roles (slug, name, description, is_system, is_director) VALUES
  ('director_general',          'Director General',           'Acceso total. Bypassa RLS y ve datos cross-empresa.', true, true),
  ('director_proyecto',         'Director de Proyecto',       'Lider operativo del proyecto.',                       true, false),
  ('planificacion',             'Planificación',              'Presupuesto, cronograma y avances.',                  true, false),
  ('ingeniero_obra',            'Ingeniero de Obra',          'Bitácora, asistencia, calidad, nómina.',              true, false),
  ('supervisor_especializado',  'Supervisor especializado',   'Lectura de obra para coordinación.',                  true, false),
  ('comprador',                 'Comprador',                  'Cotizaciones, contratistas, catálogo.',               true, false),
  ('almacenista',               'Almacenista',                'Inventario y override de stock.',                     true, false),
  ('contabilidad',              'Contabilidad',               'Libro diario, CxP, cheques, cuentas bancarias.',      true, false)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- Capabilities (catalogo de acciones)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  section text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('project','app')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.capabilities (slug, name, section, scope, sort_order) VALUES
  -- 1. Proyecto y presupuesto
  ('edit_project',             'Crear/editar proyecto',                  'proyecto',     'project',  10),
  ('edit_budget',              'Editar presupuesto',                     'proyecto',     'project',  11),
  ('edit_price_list',          'Editar lista de precios',                'proyecto',     'project',  12),
  ('edit_insumos',             'Editar listado de insumos',              'proyecto',     'project',  13),
  -- 2. Nómina
  ('create_payroll',           'Crear nómina (draft)',                   'nomina',       'project',  20),
  ('edit_payroll',             'Editar partidas/materiales/indirectos',  'nomina',       'project',  21),
  ('submit_payroll',           'Enviar nómina a aprobación',             'nomina',       'project',  22),
  ('approve_payroll',          'Aprobar nómina',                         'nomina',       'project',  23),
  ('distribute_payments',      'Distribuir pagos',                       'nomina',       'project',  24),
  ('delete_payroll_draft',     'Eliminar nómina (draft)',                'nomina',       'project',  25),
  -- 3. Compras
  ('create_requisition',       'Crear requisición',                      'compras',      'project',  30),
  ('load_quotes',              'Cargar cotizaciones',                    'compras',      'project',  31),
  ('approve_excess',           'Validar excedente de presupuesto',       'compras',      'project',  32),
  ('release_purchase_order',   'Aprobar/liberar OC',                     'compras',      'project',  33),
  ('receive_order',            'Recibir/marcar entregada',               'compras',      'project',  34),
  -- 4. Almacén
  ('inventory_write',          'Entrada/salida de material',             'almacen',      'project',  40),
  ('override_stock',           'Override stock (forzar salida negativa)','almacen',      'project',  41),
  -- 5. Obra
  ('write_bitacora',           'Bitácora',                               'obra',         'project',  50),
  ('write_attendance',         'Asistencia',                             'obra',         'project',  51),
  ('write_quality',            'Control de calidad',                     'obra',         'project',  52),
  ('measure_progress',         'Avances de obra',                        'obra',         'project',  53),
  ('write_schedule',           'Cronograma / Gantt',                     'obra',         'project',  54),
  -- 6. Cubicaciones
  ('create_contract',          'Crear contrato de ajuste',               'cubicaciones', 'project',  60),
  ('edit_contract_partidas',   'Crear partidas de contrato',             'cubicaciones', 'project',  61),
  ('create_corte',             'Crear cortes (medición)',                'cubicaciones', 'project',  62),
  ('approve_corte',            'Aprobar cortes',                         'cubicaciones', 'project',  63),
  ('sign_contract',            'Firmar contrato',                        'cubicaciones', 'project',  64),
  ('write_adelantos',          'Registrar adelantos',                    'cubicaciones', 'project',  65),
  -- 7. Finanzas
  ('write_ledger',             'Libro diario',                           'finanzas',     'project',  70),
  ('mark_paid',                'CxP - marcar pagado',                    'finanzas',     'project',  71),
  ('issue_check',              'Cheques / exportación bancaria',         'finanzas',     'app',      72),
  ('write_loans',              'Préstamos a contratistas',               'finanzas',     'app',      73),
  ('view_cashflow',            'Ver flujo de caja',                      'finanzas',     'project',  74),
  -- 8. Maestros
  ('write_contractors',        'Contratistas (CRUD)',                    'maestros',     'app',      80),
  ('write_suppliers',          'Suplidores (CRUD)',                      'maestros',     'app',      81),
  ('write_materials_catalog',  'Catálogo de materiales',                 'maestros',     'app',      82),
  ('write_bank_accounts',      'Cuentas bancarias',                      'maestros',     'app',      83),
  ('write_project_indirects',  '% indirectos del proyecto',              'maestros',     'project',  84),
  -- 9. Cross-empresa
  ('view_director_dashboard',  'Ver /director (KPIs cross-empresa)',     'cross',        'app',      90),
  ('view_approvals_log',       'Ver /aprobaciones (audit log)',          'cross',        'app',      91),
  ('view_reportes',            'Ver /reportes',                          'cross',        'app',      92),
  ('view_price_history',       'Ver historial de precios',               'cross',        'app',      93),
  -- 10. Admin
  ('manage_users',             'Administrar usuarios',                   'admin',        'app',     100),
  ('manage_roles',             'Administrar roles y permisos',           'admin',        'app',     101)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================================
-- role_capabilities (mapping M2M)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.role_capabilities (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, capability_id)
);

-- Helper para seedear: inserta la cap p_cap para el rol p_role
CREATE OR REPLACE FUNCTION public._grant_cap(p_role text, p_cap text) RETURNS void
LANGUAGE sql AS $$
  INSERT INTO public.role_capabilities (role_id, capability_id)
  SELECT r.id, c.id
  FROM public.roles r, public.capabilities c
  WHERE r.slug = p_role AND c.slug = p_cap
  ON CONFLICT DO NOTHING;
$$;

-- Director general: todo (aunque tambien bypasa via is_director)
INSERT INTO public.role_capabilities (role_id, capability_id)
SELECT r.id, c.id FROM public.roles r, public.capabilities c
WHERE r.slug = 'director_general'
ON CONFLICT DO NOTHING;

-- Director de proyecto
SELECT public._grant_cap('director_proyecto', cap) FROM unnest(ARRAY[
  'edit_project','edit_budget','edit_price_list','edit_insumos',
  'create_payroll','edit_payroll','submit_payroll','approve_payroll',
  'distribute_payments','delete_payroll_draft',
  'release_purchase_order','receive_order',
  'inventory_write','override_stock',
  'write_bitacora','write_attendance',
  'create_contract','edit_contract_partidas','create_corte','approve_corte',
  'sign_contract','write_adelantos',
  'view_cashflow'
]) AS cap;

-- Planificación
SELECT public._grant_cap('planificacion', cap) FROM unnest(ARRAY[
  'edit_project','edit_budget','edit_price_list','edit_insumos',
  'approve_excess',
  'measure_progress','write_schedule'
]) AS cap;

-- Ingeniero de Obra
SELECT public._grant_cap('ingeniero_obra', cap) FROM unnest(ARRAY[
  'create_payroll','edit_payroll','submit_payroll',
  'create_requisition','receive_order',
  'write_bitacora','write_attendance','write_quality','measure_progress',
  'create_corte'
]) AS cap;

-- Comprador
SELECT public._grant_cap('comprador', cap) FROM unnest(ARRAY[
  'load_quotes','approve_excess',
  'create_contract','edit_contract_partidas','sign_contract',
  'write_contractors','write_suppliers','write_materials_catalog',
  'write_project_indirects'
]) AS cap;

-- Almacenista
SELECT public._grant_cap('almacenista', cap) FROM unnest(ARRAY[
  'receive_order',
  'inventory_write','override_stock'
]) AS cap;

-- Contabilidad
SELECT public._grant_cap('contabilidad', cap) FROM unnest(ARRAY[
  'write_ledger','mark_paid','issue_check',
  'write_bank_accounts'
]) AS cap;

-- Supervisor especializado: solo lectura, no recibe capabilities W
-- (las pantallas las recibe via SELECT abierto en RLS)

-- =====================================================================
-- Datos del empleado en user_profiles
-- =====================================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS first_name      text,
  ADD COLUMN IF NOT EXISTS last_name       text,
  ADD COLUMN IF NOT EXISTS cedula          text,
  ADD COLUMN IF NOT EXISTS passport        text,
  ADD COLUMN IF NOT EXISTS phone           text,
  ADD COLUMN IF NOT EXISTS job_title       text,
  ADD COLUMN IF NOT EXISTS hire_date       date,
  ADD COLUMN IF NOT EXISTS is_active       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS salary          numeric(12,2),
  ADD COLUMN IF NOT EXISTS payment_terms   text,
  ADD COLUMN IF NOT EXISTS bank_account_id uuid REFERENCES public.bank_accounts(id);

-- Backfill: first_name/last_name desde display_name si solo hay un nombre
UPDATE public.user_profiles
SET first_name = split_part(display_name, ' ', 1),
    last_name = NULLIF(substring(display_name FROM position(' ' IN display_name) + 1), '')
WHERE first_name IS NULL AND display_name IS NOT NULL;

-- =====================================================================
-- user_documents (cedula, contrato, etc)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.user_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('cedula','passport','contract','other')),
  file_path text NOT NULL,
  display_name text,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE public.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capabilities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents   ENABLE ROW LEVEL SECURITY;

-- roles, capabilities, role_capabilities: SELECT abierto, WRITE solo DG
DROP POLICY IF EXISTS "rls_select_authenticated" ON public.roles;
CREATE POLICY "rls_select_authenticated" ON public.roles
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rls_write_roles" ON public.roles;
CREATE POLICY "rls_write_roles" ON public.roles FOR ALL TO authenticated
  USING (public.current_user_is_director())
  WITH CHECK (public.current_user_is_director());

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.capabilities;
CREATE POLICY "rls_select_authenticated" ON public.capabilities
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rls_write_capabilities" ON public.capabilities;
CREATE POLICY "rls_write_capabilities" ON public.capabilities FOR ALL TO authenticated
  USING (public.current_user_is_director())
  WITH CHECK (public.current_user_is_director());

DROP POLICY IF EXISTS "rls_select_authenticated" ON public.role_capabilities;
CREATE POLICY "rls_select_authenticated" ON public.role_capabilities
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "rls_write_role_capabilities" ON public.role_capabilities;
CREATE POLICY "rls_write_role_capabilities" ON public.role_capabilities FOR ALL TO authenticated
  USING (public.current_user_is_director())
  WITH CHECK (public.current_user_is_director());

-- user_documents: el dueño los ve, DG los ve/edita todos
DROP POLICY IF EXISTS "rls_select_user_documents" ON public.user_documents;
CREATE POLICY "rls_select_user_documents" ON public.user_documents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_director());
DROP POLICY IF EXISTS "rls_write_user_documents" ON public.user_documents;
CREATE POLICY "rls_write_user_documents" ON public.user_documents FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.current_user_is_director())
  WITH CHECK (user_id = auth.uid() OR public.current_user_is_director());

-- user_profiles: ya tiene policy rls_write_own_profile. DG la edita.
-- No tocamos.

-- =====================================================================
-- Funciones helper para chequear capabilities en RLS
-- =====================================================================
CREATE OR REPLACE FUNCTION public.user_has_capability(
  p_project_id uuid,
  p_capability text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT public.current_user_is_director()
      OR (p_project_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.project_members pm
        JOIN public.roles r ON r.slug = pm.role
        JOIN public.role_capabilities rc ON rc.role_id = r.id
        JOIN public.capabilities c ON c.id = rc.capability_id
        WHERE pm.project_id = p_project_id
          AND pm.user_id = auth.uid()
          AND c.slug = p_capability
      ));
$$;

CREATE OR REPLACE FUNCTION public.user_has_any_capability(
  p_project_id uuid,
  VARIADIC p_capabilities text[]
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT public.current_user_is_director()
      OR (p_project_id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.project_members pm
        JOIN public.roles r ON r.slug = pm.role
        JOIN public.role_capabilities rc ON rc.role_id = r.id
        JOIN public.capabilities c ON c.id = rc.capability_id
        WHERE pm.project_id = p_project_id
          AND pm.user_id = auth.uid()
          AND c.slug = ANY(p_capabilities)
      ));
$$;

CREATE OR REPLACE FUNCTION public.user_has_capability_anywhere(
  p_capability text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT public.current_user_is_director()
      OR EXISTS (
        SELECT 1
        FROM public.project_members pm
        JOIN public.roles r ON r.slug = pm.role
        JOIN public.role_capabilities rc ON rc.role_id = r.id
        JOIN public.capabilities c ON c.id = rc.capability_id
        WHERE pm.user_id = auth.uid()
          AND c.slug = p_capability
      );
$$;

-- Revocar EXECUTE de anon/public en los helpers nuevos
REVOKE ALL ON FUNCTION public.user_has_capability(uuid, text)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_has_any_capability(uuid, text[])       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_has_capability_anywhere(text)          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.user_has_capability(uuid, text)             TO authenticated;
GRANT  EXECUTE ON FUNCTION public.user_has_any_capability(uuid, text[])       TO authenticated;
GRANT  EXECUTE ON FUNCTION public.user_has_capability_anywhere(text)          TO authenticated;

-- Limpiar el helper de seed
DROP FUNCTION IF EXISTS public._grant_cap(text, text);
