-- =====================================================
-- 094 — Cierre de mes real (congelar movimientos de dinero)
--
-- Antes solo existía una LISTA de pendientes (página Cierre de Mes), pero nada
-- impedía cambiar o borrar movimientos de meses pasados. Esta migración agrega:
--   1) Tabla closed_months: registra qué mes de qué proyecto quedó cerrado.
--   2) Regla en el servidor (trigger) que impide insertar, editar o borrar
--      transacciones cuya fecha cae en un mes cerrado de ese proyecto, hasta
--      que se reabra. Así el candado es de verdad, no solo en la pantalla.
--
-- Seguro de aplicar: mientras no se cierre ningún mes, la tabla está vacía y el
-- trigger no bloquea nada. Reversible.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.closed_months (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  year_month  text NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  closed_by   text,
  note        text,
  closed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, year_month)
);

ALTER TABLE public.closed_months ENABLE ROW LEVEL SECURITY;

-- Ver los meses cerrados: cualquier miembro del proyecto.
CREATE POLICY closed_months_select ON public.closed_months
  FOR SELECT TO authenticated
  USING (public.is_member_of_project(project_id));

-- Cerrar un mes: quien lleva el libro diario del proyecto o un director.
CREATE POLICY closed_months_insert ON public.closed_months
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_director() OR public.user_has_capability(project_id, 'write_ledger'));

-- Reabrir un mes (borrar el cierre): solo director.
CREATE POLICY closed_months_delete ON public.closed_months
  FOR DELETE TO authenticated
  USING (public.current_user_is_director());

-- -------------------------------------------------------
-- Regla del servidor: no tocar movimientos de un mes cerrado
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_month_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ym_old text;
  v_ym_new text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_ym_old := to_char(OLD.date, 'YYYY-MM');
    IF EXISTS (SELECT 1 FROM public.closed_months c
               WHERE c.project_id = OLD.project_id AND c.year_month = v_ym_old) THEN
      RAISE EXCEPTION 'MONTH_CLOSED: El mes % de este proyecto está cerrado. Reábrelo para modificar sus movimientos.', v_ym_old
        USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  -- INSERT o UPDATE: el mes de destino no puede estar cerrado.
  v_ym_new := to_char(NEW.date, 'YYYY-MM');
  IF EXISTS (SELECT 1 FROM public.closed_months c
             WHERE c.project_id = NEW.project_id AND c.year_month = v_ym_new) THEN
    RAISE EXCEPTION 'MONTH_CLOSED: El mes % de este proyecto está cerrado. Reábrelo para modificar sus movimientos.', v_ym_new
      USING ERRCODE = 'P0001';
  END IF;

  -- En UPDATE, tampoco se puede SACAR un movimiento de un mes ya cerrado.
  IF (TG_OP = 'UPDATE') THEN
    v_ym_old := to_char(OLD.date, 'YYYY-MM');
    IF (OLD.project_id, v_ym_old) IS DISTINCT FROM (NEW.project_id, v_ym_new)
       AND EXISTS (SELECT 1 FROM public.closed_months c
                   WHERE c.project_id = OLD.project_id AND c.year_month = v_ym_old) THEN
      RAISE EXCEPTION 'MONTH_CLOSED: El mes % de este proyecto está cerrado. Reábrelo para modificar sus movimientos.', v_ym_old
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_month_close ON public.transactions;
CREATE TRIGGER trg_enforce_month_close
  BEFORE INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_month_close();
