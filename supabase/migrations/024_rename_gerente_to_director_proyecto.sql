-- Renombrar el rol 'gerente_proyecto' a 'director_proyecto' en toda la BD.
-- Decisión de producto: el rol pasa a llamarse "Director de Proyecto" en UI;
-- el slug interno se alinea para evitar mismatches entre app y BD.

ALTER TABLE public.project_members DROP CONSTRAINT IF EXISTS project_members_role_check;

UPDATE public.project_members
SET role = 'director_proyecto'
WHERE role = 'gerente_proyecto';

ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_role_check
  CHECK (role IN (
    'director_general',
    'director_proyecto',
    'planificacion',
    'ingeniero_obra',
    'supervisor_especializado',
    'comprador',
    'almacenista',
    'contabilidad'
  ));

UPDATE auth.users
SET email = 'director@nominapp.local'
WHERE email = 'gerente@nominapp.local';
