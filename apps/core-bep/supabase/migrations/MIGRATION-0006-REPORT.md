# MIGRATION-0006-REPORT.md

**Migración:** `0006_security_hardening`  
**Fecha autoría:** 2026-06-27  
**Estado:** ✅ Lista para revisión — pendiente aprobación para aplicar a producción  
**Continuación de:** `0005_bom_crud` (aplicada y verificada 2026-06-27)

---

## Resumen ejecutivo

La revisión de seguridad post-0005 identificó tres vulnerabilidades críticas (P1, P2, P3). La Fase 0 de descubrimiento determinó que P1 y P3 ya estaban corregidas en la base antes de que se ejecutara esta migración. El único cambio de estado que aplica `0006_security_hardening.sql` es el seed del superadmin (P2).

---

## Problemas identificados y estado

### P1 — Escalada de privilegios via `profiles_update` (Crítico)

**Vulnerabilidad documentada:** La policy `profiles_update` tenía `USING (auth.uid() = id)` sin `WITH CHECK`, permitiendo a cualquier usuario autenticado ejecutar `UPDATE profiles SET is_superadmin = true WHERE id = <su propio id>`.

**Estado al momento de Fase 0:** ✅ **Ya corregido en base**

La policy ya tiene el `WITH CHECK` correcto:

```sql
WITH CHECK (
  (auth.uid() = id)
  AND (is_superadmin = COALESCE(
    (SELECT p.is_superadmin FROM profiles p WHERE p.id = auth.uid()),
    false
  ))
)
```

El `COALESCE(..., false)` cubre el edge case de usuarios nuevos sin fila en `profiles` todavía (ya que no hay trigger `on_auth_user_created` — ver P2).

**Acción en 0006:** Ninguna. No se re-emite la policy para no introducir riesgo en algo que funciona correctamente.

---

### P2 — Superadmin inoperativo: `profiles` vacío (Crítico)

**Vulnerabilidad documentada:** `profiles` tenía 0 filas. `is_superadmin()` devolvía `false` para todos los usuarios, bloqueando todas las operaciones que requieren superadmin (DELETE físico, operaciones sobre tablas maestras vía soft_delete).

**Estado al momento de Fase 0:** ❌ **Pendiente — corregido por esta migración**

**Hallazgos de descubrimiento relevantes:**
- No existe trigger `on_auth_user_created` — las filas en `profiles` no se crean automáticamente al registrarse un usuario.
- Todas las columnas adicionales de `profiles` (`full_name`, `role`, `entity`, etc.) son `nullable` — el INSERT mínimo `(id, is_superadmin)` es válido.
- `is_superadmin` tiene `DEFAULT false` y es `NOT NULL`.

**Fix aplicado:**

```sql
INSERT INTO public.profiles (id, is_superadmin)
VALUES ('5e12ace0-05c6-4208-b7c8-8250b7063848', true)
ON CONFLICT (id) DO UPDATE
  SET is_superadmin = true;
```

**Superadmin seed:** UUID `5e12ace0-05c6-4208-b7c8-8250b7063848` (primer login pendiente).

---

### P3 — `soft_delete` / `restore_soft_delete` sin autorización por fila (Crítico)

**Vulnerabilidad documentada:** Ambas funciones eran `SECURITY DEFINER` con whitelist de tabla pero sin verificar si el caller tenía permiso sobre la fila o el proyecto. Cualquier usuario autenticado podía soft-deletear o restaurar filas de cualquier proyecto.

**Estado al momento de Fase 0:** ✅ **Ya corregido en base**

Ambas funciones ya implementan la lógica completa de autorización por fila:
- Fast-path para `is_superadmin()`.
- Bloqueo explícito de tablas maestras (`organizations`, `workspaces`, `manufacturers`, `products`) para usuarios no-superadmin.
- `CASE` con mapeo completo de `project_id` — directo para 11 tablas, vía FK para `quotes` y `rfq_lines`, identidad para `projects`.
- Verificación de `has_project_permission(v_project_id, 'delete')` para usuarios regulares.

**Acción en 0006:** Ninguna. No se re-emiten las funciones con `CREATE OR REPLACE` para no tocar código en producción que ya es correcto.

---

## Archivos entregados

| Archivo | Descripción |
|---|---|
| `0006_security_hardening.sql` | Migración — seed superadmin (P2) |
| `0006_rollback.sql` | Rollback — elimina la fila del superadmin si no tiene datos de perfil |
| `MIGRATION-0006-REPORT.md` | Este documento |

**Ruta sugerida:** `apps/core-bep/supabase/migrations/`

---

## Rollback — consideraciones

El rollback elimina la fila del superadmin condicionalmente: solo si las columnas de perfil opcionales están en NULL (es decir, si el superadmin no ha completado su perfil desde el primer login). Si el superadmin ya hizo login y llenó datos, el DELETE no afecta filas y el rollback incluye instrucciones para el caso manual (`UPDATE ... SET is_superadmin = false`).

El rollback **no** revierte P1 ni P3 — ambos estaban corregidos antes de 0006 y revertirlos implicaría reintroducir vulnerabilidades deliberadamente.

---

## Verificación post-aplicación

Correr en Supabase SQL Editor después de aplicar la migración:

```sql
-- 1. Fila del superadmin
SELECT id, is_superadmin
FROM public.profiles
WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';
-- Esperado: 1 fila, is_superadmin = true

-- 2. is_superadmin() (autenticado como el superadmin)
SELECT is_superadmin();
-- Esperado: true

-- 3. Control: profiles_update WITH CHECK sigue en pie
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'UPDATE';
-- Esperado: with_check IS NOT NULL
```

---

## Fuera de alcance (0006)

- Mover `is_superadmin` a tabla `app_admins` separada → mejora futura
- UI de administración de superadmins
- Migración 0007 (`transactional_outbox`)
- CRUD de otras tablas

---

**NO aplicar a producción sin aprobación humana.**
