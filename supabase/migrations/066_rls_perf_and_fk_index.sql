-- Migration 057: ajustes de rendimiento detectados por los advisors de Supabase
--
-- 1) RLS "Auth Initialization Plan": dos políticas reevaluaban auth.uid() /
--    current_user_is_director() por fila. Envolverlas en (select ...) hace que
--    se evalúen una sola vez por consulta. Solo cambia el rendimiento; la lógica
--    de acceso es idéntica.
-- 2) FK sin índice: purchase_requisitions.approved_quote_id.
--
-- Idempotente: ALTER POLICY reescribe la condición; CREATE INDEX IF NOT EXISTS.

BEGIN;

ALTER POLICY project_members_read ON public.project_members
  USING ((select current_user_is_director()) OR (user_id = (select auth.uid())));

ALTER POLICY rls_select_user_documents ON public.user_documents
  USING ((user_id = (select auth.uid())) OR (select current_user_is_director()));

CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_approved_quote_id
  ON public.purchase_requisitions (approved_quote_id);

COMMIT;
