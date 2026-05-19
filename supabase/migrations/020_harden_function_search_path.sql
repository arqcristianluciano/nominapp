-- =====================================================
-- NominApp - Migración 020: Hardening de search_path en funciones
-- Resuelve el advisor function_search_path_mutable: las funciones SQL
-- sin SET search_path son vulnerables a override de schemas.
-- =====================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION current_user_has_role(p_project_id UUID, p_roles TEXT[])
RETURNS BOOLEAN LANGUAGE SQL STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE user_id = auth.uid() AND project_id = p_project_id AND role = ANY(p_roles)
  );
$$;

CREATE OR REPLACE FUNCTION current_user_is_director()
RETURNS BOOLEAN LANGUAGE SQL STABLE
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT is_director FROM user_profiles WHERE id = auth.uid()), FALSE);
$$;
