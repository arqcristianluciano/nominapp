-- 088_schedule_task_number_server_assign
-- Arregla el error "duplicate key value violates unique constraint
-- uniq_schedule_tasks_project_number" al guardar tareas del cronograma.
--
-- Antes la app calculaba el número de tarea leyendo el máximo y sumando 1
-- desde el navegador; dos guardados casi simultáneos (o un doble clic)
-- calculaban el mismo número y el segundo fallaba contra el índice único
-- de la migración 085. Ahora el número lo asigna la base de datos en el
-- momento de insertar, serializado por proyecto con un candado de
-- transacción, de modo que nunca se repite y el primer guardado siempre
-- funciona.
--
-- NOTAS DE DISEÑO:
--   - Solo asigna cuando task_number llega NULL (la app deja de enviarlo).
--   - pg_advisory_xact_lock serializa inserciones del mismo proyecto; se
--     libera sola al terminar la transacción.
--   - SECURITY DEFINER + search_path = '' siguen el patrón de la migración 080.

CREATE OR REPLACE FUNCTION public.assign_schedule_task_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.task_number IS NULL THEN
    -- Serializa la numeración por proyecto: dos inserciones simultáneas del
    -- mismo proyecto esperan su turno y obtienen números consecutivos.
    PERFORM pg_advisory_xact_lock(hashtext('schedule_tasks:' || NEW.project_id::text));
    SELECT COALESCE(MAX(task_number), 0) + 1
      INTO NEW.task_number
      FROM public.schedule_tasks
     WHERE project_id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_schedule_task_number ON public.schedule_tasks;
CREATE TRIGGER trg_assign_schedule_task_number
  BEFORE INSERT ON public.schedule_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_schedule_task_number();
