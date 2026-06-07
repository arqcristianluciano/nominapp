-- =============================================================
-- NominApp – Migración 076: Jerarquía de tareas en cronograma
-- Tabla: schedule_tasks
-- Cambios aditivos / idempotentes (IF NOT EXISTS / IF NOT EXIST).
-- NO modifica ni elimina columnas existentes.
-- =============================================================

-- 1. Columna parent_task_id: vincula una subtarea a su tarea padre
ALTER TABLE schedule_tasks
  ADD COLUMN IF NOT EXISTS parent_task_id uuid NULL
    REFERENCES schedule_tasks(id) ON DELETE CASCADE;

-- 2. Columna task_number: número de orden secuencial dentro del proyecto
ALTER TABLE schedule_tasks
  ADD COLUMN IF NOT EXISTS task_number integer NULL;

-- 3. Columna predecessor_id: dependencia predecesora de otra tarea del proyecto
ALTER TABLE schedule_tasks
  ADD COLUMN IF NOT EXISTS predecessor_id uuid NULL
    REFERENCES schedule_tasks(id) ON DELETE SET NULL;

-- 4. Columna is_milestone: indica si la tarea es un hito (punto de control)
ALTER TABLE schedule_tasks
  ADD COLUMN IF NOT EXISTS is_milestone boolean NOT NULL DEFAULT false;

-- 5. Índice compuesto para consultas ordenadas por proyecto y número de tarea
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_project_task_number
  ON schedule_tasks(project_id, task_number ASC NULLS LAST);

-- 6. Índice en parent_task_id para obtener subtareas eficientemente
CREATE INDEX IF NOT EXISTS idx_schedule_tasks_parent
  ON schedule_tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- 7. Backfill: asignar task_number a filas existentes que aún no lo tienen.
--    Se numeran desde 1, por proyecto, ordenadas por fecha de creación.
DO $$
BEGIN
  UPDATE schedule_tasks t
  SET task_number = sub.rn
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY project_id
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM schedule_tasks
    WHERE task_number IS NULL
  ) sub
  WHERE t.id = sub.id;
END;
$$;
