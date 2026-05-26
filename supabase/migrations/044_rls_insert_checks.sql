-- =====================================================================
-- 044 - Security fix: tighten INSERT RLS WITH CHECK on approvals & projects
-- ---------------------------------------------------------------------
-- RLS audit (project pkllcsexipdvwdpunlkz) found two over-permissive
-- INSERT policies:
--
--   1) approvals.rls_insert_approvals had WITH CHECK (true) -> any
--      authenticated user could insert any approval/audit row, e.g. forge
--      an entry attributed to another user (actor_user_id spoofing).
--
--   2) projects.rls_insert_projects used
--      user_has_capability_anywhere('edit_project') -> a user holding
--      edit_project in ANY company could create projects in ANY company
--      (cross-company privilege escalation), since the check is not
--      scoped to company_id.
--
-- This migration replaces both INSERT policies with company/actor-scoped
-- WITH CHECK clauses. SELECT/UPDATE/DELETE policies are left untouched.
--
-- Idempotent: uses DROP POLICY IF EXISTS before CREATE.
-- auth.uid() is wrapped as (select auth.uid()) so the initplan is
-- evaluated once per statement (RLS performance best practice).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) approvals: only allow inserting an audit/approval row for the
--    acting caller, or allow a director.
--
-- approvals.actor_user_id is TEXT and NULLABLE (no default). Services
-- write audit/approval rows on behalf of the acting user and set
-- actor_user_id to that user's id (text). The check therefore:
--   - permits NULL actor_user_id (system/service rows that do not
--     attribute an actor), preserving legitimate audit logging;
--   - when actor_user_id IS set, requires it to equal the caller's uid,
--     preventing a user from forging a row attributed to someone else;
--   - always permits directors.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_insert_approvals" ON public.approvals;
CREATE POLICY "rls_insert_approvals" ON public.approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_is_director()
    OR actor_user_id IS NULL
    OR actor_user_id = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------
-- 2) projects: a user may only create a project in a company they
--    belong to (or a director, who may create anywhere).
--
-- user_companies() (SECURITY DEFINER) returns the caller's company_ids
-- derived from project_members -> projects.company_id.
--
-- CAVEAT: user_companies() is membership-derived, so it cannot cover the
-- very first project of a brand-new company (the caller has no
-- membership in that company yet, and projects.company_id is nullable).
-- That bootstrap case is intentionally restricted to directors via
-- current_user_is_director(); a NULL company_id likewise only passes for
-- directors. Non-director bootstrap of a new company should go through a
-- privileged/server path if ever required.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_insert_projects" ON public.projects;
CREATE POLICY "rls_insert_projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_is_director()
    OR company_id IN (SELECT * FROM public.user_companies())
  );
