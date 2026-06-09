-- 083_prevent_self_director_escalation
-- Seguridad S1: impedir que un usuario autenticado que NO es director cambie la
-- casilla is_director (ni la suya ni la de otro). Solo un director puede otorgar o
-- quitar ese rol. Cuando no hay usuario autenticado (auth.uid() IS NULL: migraciones,
-- service role, consola SQL) NO se bloquea, para no estorbar operaciones de confianza.
CREATE OR REPLACE FUNCTION public.prevent_self_director_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.is_director IS DISTINCT FROM OLD.is_director)
     AND auth.uid() IS NOT NULL
     AND NOT public.current_user_is_director() THEN
    NEW.is_director := OLD.is_director;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_director_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_self_director_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_director_escalation();
