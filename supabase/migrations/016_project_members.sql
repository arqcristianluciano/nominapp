-- =====================================================
-- NominApp - Migración 016: Roles por proyecto + perfil de usuario
-- Estado deseado, sección 4: roles asignables por proyecto (no globales).
-- Permite que un mismo usuario sea Gerente en un proyecto y Supervisor
-- en otro. Habilita RLS por rol/proyecto cuando Auth real esté activo.
-- =====================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY,
  display_name    TEXT NOT NULL,
  email           TEXT,
  is_director     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Roles soportados (estado deseado, sección 4)
CREATE TABLE IF NOT EXISTS project_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN (
    'director_general',
    'gerente_proyecto',
    'planificacion',
    'ingeniero_obra',
    'supervisor_especializado',
    'comprador',
    'almacenista',
    'contabilidad'
  )),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, role)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user
  ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project
  ON project_members(project_id);

-- Helper SQL: ¿el usuario actual tiene alguno de los roles dados en el proyecto?
CREATE OR REPLACE FUNCTION current_user_has_role(p_project_id UUID, p_roles TEXT[])
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE user_id = auth.uid()
      AND project_id = p_project_id
      AND role = ANY(p_roles)
  );
$$;

-- Helper SQL: ¿es Director General?
CREATE OR REPLACE FUNCTION current_user_is_director()
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    (SELECT is_director FROM user_profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

COMMENT ON TABLE user_profiles IS
  'Perfil de cada usuario autenticado. id = auth.users.id. Director General se marca con is_director=true.';
COMMENT ON TABLE project_members IS
  'Asignación de roles por proyecto (sección 4). Un usuario puede tener distintos roles en distintos proyectos.';
