-- Migration 037: Audit triggers for RBAC tables
--
-- Closes the bypass risk in adminService: any mutation performed via
-- direct SQL (psql, Supabase Studio, service-role scripts, manual
-- patches, etc.) on the RBAC tables would not reach the application
-- code that calls approvalsService, and therefore would not be logged.
--
-- This migration installs AFTER INSERT/UPDATE/DELETE triggers on:
--   * public.roles
--   * public.capabilities
--   * public.role_capabilities
--   * public.project_members
--
-- Each trigger inserts a row into public.approvals with payload_before /
-- payload_after JSON snapshots, matching the entity_type values already
-- used by adminService.ts so dashboards keep working.
--
-- Notes:
--   * approvals.entity_id is UUID. For tables with a single uuid PK
--     (roles, capabilities, project_members) we use that PK directly.
--     role_capabilities has a composite PK (role_id, capability_id) and
--     no single uuid id, so we record role_id as entity_id and stash
--     both ids in metadata for traceability.
--   * Functions are SECURITY DEFINER with a locked search_path so they
--     can write to public.approvals regardless of the caller's RLS, and
--     to avoid the unqualified-name hijack pattern flagged in
--     migration 020.
--   * actor_user_id falls back to 'system' when auth.uid() is NULL
--     (service role, cron jobs, direct SQL). This is the same fallback
--     adminService uses when no session is present.
--   * Triggers are AFTER ROW so the insert into approvals only happens
--     once the underlying mutation has succeeded.

BEGIN;

-- =====================================================
-- 1) roles
-- =====================================================
CREATE OR REPLACE FUNCTION public._audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.approvals (
    entity_type, entity_id, action, actor_user_id,
    payload_before, payload_after, metadata
  )
  VALUES (
    'role',
    COALESCE(NEW.id, OLD.id),
    TG_OP::text,
    COALESCE(auth.uid()::text, 'system'),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
    jsonb_build_object('source', 'trigger', 'table', 'roles')
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS trg_audit_roles ON public.roles;
CREATE TRIGGER trg_audit_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public._audit_role_changes();

-- =====================================================
-- 2) capabilities
-- =====================================================
CREATE OR REPLACE FUNCTION public._audit_capability_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.approvals (
    entity_type, entity_id, action, actor_user_id,
    payload_before, payload_after, metadata
  )
  VALUES (
    'capability',
    COALESCE(NEW.id, OLD.id),
    TG_OP::text,
    COALESCE(auth.uid()::text, 'system'),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
    jsonb_build_object('source', 'trigger', 'table', 'capabilities')
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS trg_audit_capabilities ON public.capabilities;
CREATE TRIGGER trg_audit_capabilities
  AFTER INSERT OR UPDATE OR DELETE ON public.capabilities
  FOR EACH ROW EXECUTE FUNCTION public._audit_capability_changes();

-- =====================================================
-- 3) role_capabilities  (composite PK: role_id + capability_id)
-- =====================================================
CREATE OR REPLACE FUNCTION public._audit_role_capability_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role_id       uuid := COALESCE(NEW.role_id, OLD.role_id);
  v_capability_id uuid := COALESCE(NEW.capability_id, OLD.capability_id);
BEGIN
  INSERT INTO public.approvals (
    entity_type, entity_id, action, actor_user_id,
    payload_before, payload_after, metadata
  )
  VALUES (
    'role_capability',
    -- approvals.entity_id is uuid; the application-side code uses a
    -- composite string ("roleId:capabilityId") but we cannot store that
    -- in a uuid column. Keep role_id as entity_id (the canonical pivot
    -- for dashboards) and stash both ids in metadata for traceability.
    v_role_id,
    TG_OP::text,
    COALESCE(auth.uid()::text, 'system'),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
    jsonb_build_object(
      'source', 'trigger',
      'table', 'role_capabilities',
      'role_id', v_role_id,
      'capability_id', v_capability_id,
      'composite_key', v_role_id::text || ':' || v_capability_id::text
    )
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS trg_audit_role_capabilities ON public.role_capabilities;
CREATE TRIGGER trg_audit_role_capabilities
  AFTER INSERT OR UPDATE OR DELETE ON public.role_capabilities
  FOR EACH ROW EXECUTE FUNCTION public._audit_role_capability_changes();

-- =====================================================
-- 4) project_members
-- =====================================================
CREATE OR REPLACE FUNCTION public._audit_project_member_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.approvals (
    entity_type, entity_id, action, actor_user_id,
    payload_before, payload_after, metadata
  )
  VALUES (
    'project_member',
    COALESCE(NEW.id, OLD.id),
    TG_OP::text,
    COALESCE(auth.uid()::text, 'system'),
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
    jsonb_build_object(
      'source', 'trigger',
      'table', 'project_members',
      'project_id', COALESCE(NEW.project_id, OLD.project_id),
      'user_id',    COALESCE(NEW.user_id,    OLD.user_id),
      'role',       COALESCE(NEW.role,       OLD.role)
    )
  );
  RETURN COALESCE(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS trg_audit_project_members ON public.project_members;
CREATE TRIGGER trg_audit_project_members
  AFTER INSERT OR UPDATE OR DELETE ON public.project_members
  FOR EACH ROW EXECUTE FUNCTION public._audit_project_member_changes();

COMMIT;
