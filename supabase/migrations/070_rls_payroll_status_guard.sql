-- =====================================================================
-- 059 - Guarda de transiciones de etapa del reporte de nomina (servidor)
-- ---------------------------------------------------------------------
-- Complemento de 058_rls_payroll_edit_by_stage.sql.
--
-- 058 puso candado al CONTENIDO del reporte por etapa (labor_line_items,
-- material_invoices, indirect_costs, material_invoice_items): enviado /
-- aprobado / pagado solo los edita `approve_payroll`. Pero la ETIQUETA de
-- estado de payroll_periods (draft -> submitted -> approved -> paid) no tenia
-- candado sobre QUIEN la mueve: la politica rls_write_payroll_periods deja a
-- cualquier capability de nomina actualizar la fila, sin validar la transicion.
--
-- Hueco que cierra:
--   Un usuario con captura de datos (edit_payroll) podia -saltandose la UI-
--   devolver un reporte 'approved' a 'draft', editar las cifras (058 permite
--   editar borradores) y volver a 'approved', sin pasar por el Director. El
--   limite "solo el Director aprueba / devuelve" vivia SOLO en la pantalla
--   (PayrollEditorSections: requiresDirector; payrollItemPermissions:
--   canReturnPayrollToDraft).
--
-- Por que un trigger y no RLS:
--   Validar una TRANSICION exige mirar el estado anterior (OLD) y el nuevo
--   (NEW) a la vez. En RLS, USING ve la fila vieja y WITH CHECK la nueva, pero
--   no se pueden cruzar en un mismo predicado. Un trigger BEFORE si ve ambos.
--   Esta guarda se SUMA a rls_write_payroll_periods (defensa en profundidad):
--   esa politica sigue decidiendo quien puede tocar la fila; esta valida que
--   el salto de etapa sea legitimo y autorizado.
--
-- Reglas (identicas a la UI):
--   * INSERT: un reporte nace en 'draft'. Crear directamente en un estado
--             comprometido queda reservado a `approve_payroll`.
--   * draft     -> submitted : `submit_payroll` o `approve_payroll`.
--   * submitted -> approved  : `approve_payroll`.
--   * approved  -> paid      : `approve_payroll`.
--   * submitted/approved -> draft (devolver para correccion): `approve_payroll`.
--   * 'paid' es terminal: no se revierte aqui.
--   * Cualquier otro salto (p. ej. draft->approved, submitted->paid,
--     approved->submitted, paid->*) queda bloqueado.
--   * UPDATE que no cambia el estado: esta guarda no interviene.
--
-- Idempotente.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.enforce_payroll_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_can_approve boolean;
  v_can_submit  boolean;
BEGIN
  -- INSERT: los reportes nacen en borrador; sembrar uno ya comprometido
  -- (enviado/aprobado/pagado) queda reservado a quien aprueba.
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'draft'
       AND NOT public.user_has_capability(NEW.project_id, 'approve_payroll') THEN
      RAISE EXCEPTION 'Un reporte de nomina nuevo debe iniciar en borrador'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE sin cambio de etapa: fuera del alcance de esta guarda.
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  v_can_approve := public.user_has_capability(NEW.project_id, 'approve_payroll');
  v_can_submit  := public.user_has_any_capability(NEW.project_id, 'submit_payroll', 'approve_payroll');

  IF    OLD.status = 'draft'     AND NEW.status = 'submitted' AND v_can_submit  THEN
    RETURN NEW;
  ELSIF OLD.status = 'submitted' AND NEW.status = 'approved'  AND v_can_approve THEN
    RETURN NEW;
  ELSIF OLD.status = 'approved'  AND NEW.status = 'paid'      AND v_can_approve THEN
    RETURN NEW;
  ELSIF OLD.status IN ('submitted', 'approved') AND NEW.status = 'draft' AND v_can_approve THEN
    RETURN NEW;  -- devolver a borrador para correccion
  END IF;

  RAISE EXCEPTION
    'Cambio de etapa del reporte no permitido (% -> %) o sin autorizacion suficiente',
    OLD.status, NEW.status
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

-- No debe poder invocarse suelta (solo como disparador de la tabla).
REVOKE ALL ON FUNCTION public.enforce_payroll_status_transition() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_payroll_status_transition ON public.payroll_periods;
CREATE TRIGGER trg_enforce_payroll_status_transition
  BEFORE INSERT OR UPDATE OF status ON public.payroll_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payroll_status_transition();
