-- 085_schedule_tasks_unique_number
-- R1: evita numeros de tarea repetidos dentro de un mismo proyecto cuando dos
-- personas crean tareas al mismo tiempo. Las demas tablas con numeracion
-- (ordenes, requisiciones, cortes) ya tenian esta proteccion.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_schedule_tasks_project_number
  ON public.schedule_tasks (project_id, task_number)
  WHERE task_number IS NOT NULL;
