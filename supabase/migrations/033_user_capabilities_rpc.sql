-- =====================================================================
-- 030 - RPCs para cargar capabilities del cliente
-- ---------------------------------------------------------------------
-- Devuelven los slugs de capabilities efectivas del usuario (resolviendo
-- el JOIN project_members -> roles -> role_capabilities -> capabilities).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.user_project_capabilities(p_project_id uuid)
RETURNS TABLE(capability_slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT c.slug
  FROM public.project_members pm
  JOIN public.roles r ON r.slug = pm.role
  JOIN public.role_capabilities rc ON rc.role_id = r.id
  JOIN public.capabilities c ON c.id = rc.capability_id
  WHERE pm.project_id = p_project_id
    AND pm.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_app_capabilities()
RETURNS TABLE(capability_slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT c.slug
  FROM public.project_members pm
  JOIN public.roles r ON r.slug = pm.role
  JOIN public.role_capabilities rc ON rc.role_id = r.id
  JOIN public.capabilities c ON c.id = rc.capability_id
  WHERE pm.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.user_project_capabilities(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_app_capabilities()        FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.user_project_capabilities(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.user_app_capabilities()        TO authenticated;
