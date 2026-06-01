CREATE OR REPLACE FUNCTION public.user_companies()
RETURNS TABLE(company_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT DISTINCT p.company_id
  FROM public.project_members pm
  JOIN public.projects p ON p.id = pm.project_id
  WHERE pm.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.user_companies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_companies() TO authenticated;
