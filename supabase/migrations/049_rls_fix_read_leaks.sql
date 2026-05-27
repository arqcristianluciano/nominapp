-- 049_rls_fix_read_leaks.sql
-- Cierra dos fugas de lectura cross-tenant que quedaron con USING (true) tras 043
-- (RLS SELECT tenancy). Las escrituras de estas tablas ya estaban scoped; solo
-- el SELECT quedó abierto, dejando que cualquier usuario autenticado leyera datos
-- de proyectos/empresas ajenas.
--
-- Idempotente: usa DROP POLICY IF EXISTS antes de cada cambio.

-- 1) approvals
--    Quedó una policy heredada `authenticated_read_approvals` con USING (true).
--    Como las policies PERMISSIVE se combinan con OR, anulaba a la scoped
--    `rls_select_authenticated` (director O actor). La eliminamos para que rija
--    únicamente la scoped.
drop policy if exists authenticated_read_approvals on public.approvals;

-- 2) inventory_lots
--    El SELECT era USING (true) aunque la escritura (rls_write_inventory_lots) ya
--    estaba scoped al proyecto del item padre. Recreamos el SELECT con el mismo
--    criterio de acceso por proyecto que usa el resto de las tablas.
drop policy if exists rls_select_inventory_lots on public.inventory_lots;
create policy rls_select_inventory_lots on public.inventory_lots
  for select to authenticated
  using (
    public.current_user_can_access_project(
      (select ii.project_id from public.inventory_items ii where ii.id = inventory_lots.item_id)
    )
  );
