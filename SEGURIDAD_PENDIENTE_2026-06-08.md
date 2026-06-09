# Seguridad — estado (8 jun 2026, actualizado)

Trabajé directamente sobre tu base de datos real de NominAPP, con verificación previa
(solo lectura) y cambios reversibles. Estado actual:

- ✅ **S1 — RESUELTO Y APLICADO** en producción: ya **no** se puede auto-asignar el rol
  "Director" (migración `083_prevent_self_director_escalation`).
- ✅ **S4 — DESCARTADO**: revisé las reglas y **no hay** ningún permiso abierto a
  usuarios sin sesión (`anon`) ni escrituras a "todos". Además, **todas** las tablas
  tienen seguridad por fila (RLS) activada.
- ✅ **S5 — DESCARTADO**: las reglas de proyectos **sí filtran por empresa/membresía**,
  así que no hay fuga de datos entre empresas.
- ⏳ **S2, S3, S6 — para cuando salgas de pruebas** (son ayudas de demo o configuración;
  ver abajo).

El detalle de cada uno queda abajo para referencia.

---

## S1 (ALTA) — Un usuario podría hacerse "Director" a sí mismo

**Qué pasa:** la regla `rls_write_own_profile` (migración 051) deja que cada usuario
edite su propia fila de perfil, y **no protege la casilla "es director"**. Alguien con
conocimientos podría marcarse como Director y obtener acceso total.

**Arreglo listo (revisar y aplicar como migración nueva, p.ej. `083_...sql`):**

```sql
-- Evita que un usuario que NO es director cambie la casilla is_director
-- (ni la suya ni la de nadie). Solo un director puede otorgar/quitar ese rol.
CREATE OR REPLACE FUNCTION public.prevent_self_director_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.is_director IS DISTINCT FROM OLD.is_director)
     AND NOT public.current_user_is_director() THEN
    -- Se ignora el intento de cambio del rol: se conserva el valor anterior.
    NEW.is_director := OLD.is_director;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_director_escalation ON public.user_profiles;
CREATE TRIGGER trg_prevent_self_director_escalation
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_director_escalation();
```

**Cómo probar después de aplicar:** entrar como un usuario normal e intentar marcarse
director → debe quedar igual (no director). Un director sí debe poder cambiarlo.

---

## S2 (ALTA, pero es ayuda de DEMO) — El código de aprobación es "1234"

**Qué pasa:** el código para aprobar órdenes/cortes es "1234" por defecto y vive en el
navegador (`src/utils/approvalCode.ts`); las pantallas hasta lo muestran ("En modo demo
el código es: 1234"). No protege de verdad.

**Decisión:** lo **dejé igual** porque estás en pruebas (igual que los accesos rápidos
del login que me pediste conservar). **Antes de producción** hay que: quitar el valor
por defecto "1234" y el texto que lo muestra, y mover la validación al servidor (una
función de base de datos que verifique el código), no en el navegador.

---

## S3 (ALTA, ligado a pruebas) — Usuarios/contraseñas de prueba en el código

**Qué pasa:** hay credenciales de demo y accesos rápidos en la pantalla de login.

**Decisión:** **conservados** por tu indicación (están en pruebas). **Antes de
producción**: quitar los botones de acceso rápido y cualquier usuario/clave de demo del
código, y poner la variable `VITE_ENABLE_TEST_LOGIN` vacía.

---

## S4 (ALTA — VERIFICAR en producción) — Posibles permisos viejos demasiado abiertos

**Qué hacer (rápido, sin riesgo):** en Supabase → SQL, correr esta consulta para ver si
quedó alguna regla que permita acceso sin login o a todo el mundo:

```sql
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (roles::text like '%anon%' or qual = 'true' or with_check = 'true')
order by tablename;
```

Si aparece algo con `anon` o `true`, lo revisamos y lo cerramos. Si no aparece nada,
este punto queda descartado.

---

## S5 (MEDIA — VERIFICAR) — Posible fuga de proyectos entre empresas

**Qué pasa:** la consulta del historial de un contratista
(`contractorService.getHistory`) pide **todos los proyectos** sin filtrar por empresa.
**Si** las reglas de la base (RLS) ya filtran por empresa, no hay fuga. **Si no**, un
usuario vería nombres de proyectos de otras empresas.

**Cómo verificar:** con un usuario de una empresa, abrir el historial de un contratista
y revisar que solo aparezcan proyectos de su empresa. Si aparecen de otras, se agrega un
filtro por empresa en esa consulta (cambio de código sencillo).

---

## S6 (MEDIA) — Funciones de administrar usuarios aceptan cualquier origen

**Qué hacer:** en las funciones del servidor (Edge Functions de Supabase) que manejan
usuarios, definir la variable de origen permit