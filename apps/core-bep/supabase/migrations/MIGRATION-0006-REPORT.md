# MIGRATION-0006-REPORT — Security Hardening

**Repo:** CORE / apps/core-bep  
**Fecha autoría:** 2026-06-27  
**Estado:** ⏳ Pendiente de aprobación — NO aplicada a producción  
**Depende de:** 0005_bom_crud.sql ✅ aplicada y verificada  

---

## Resumen ejecutivo

La migración 0006 cierra tres vulnerabilidades críticas introducidas en
0003–0005. Ningún bloque modifica datos de usuario existentes ni altera
el esquema de tablas. Los cambios son sobre policies, una fila seed y dos
funciones (reemplazadas con `CREATE OR REPLACE`).

---

## Fase 0 — Hallazgos del descubrimiento

### Confirmados per ground truth

| Item | Esperado | Hallado | OK |
|---|---|---|---|
| `profiles_update` sin `WITH CHECK` | `with_check = null` | ✅ null | ✅ |
| `profiles` con 0 filas | 0 filas | ✅ 0 filas | ✅ |
| `is_superadmin` tiene `DEFAULT false` | DEFAULT false, NOT NULL | ✅ | ✅ |
| Resto de columnas en `profiles` son NULL-able | mayoría nullable | ✅ solo `id` es NOT NULL adicional | ✅ |

### Discrepancias / decisiones tomadas

| # | Discrepancia | Decisión |
|---|---|---|
| D1 | Trigger `on_auth_user_created` **no existe** (0 rows devueltas) | `WITH CHECK` usa `COALESCE(subquery, false)` para no bloquear usuarios sin fila aún |
| D2 | `quotes` y `rfq_lines` no tienen `project_id` directo (confirmado ausentes en Query 4) | Resueltos via `JOIN rfqs` dentro del CASE |
| D3 | `projects` ausente en Query 4 (no fue listada en el query) | Tratada como caso especial: `v_project_id := p_id` |
| D4 | `project_members` sí tiene `project_id` (apareció en Query 4) | Tratada como tabla de proyecto, chequeo normal |

---

## Bloque 1 — Fix `profiles_update` WITH CHECK

**Vulnerabilidad cerrada:** escalada de privilegios vía `UPDATE profiles SET is_superadmin = true`.

**Antes (post-0005):**
```sql
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);
  -- Sin WITH CHECK → cualquier columna escribible
```

**Después (0006):**
```sql
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_superadmin = COALESCE(
      (SELECT p.is_superadmin FROM public.profiles p WHERE p.id = auth.uid()),
      false
    )
  );
```

**Cómo funciona el WITH CHECK:**
- Usuario normal con fila existente → subquery devuelve `false` → solo puede escribir `is_superadmin = false` → no puede escalarse.
- Superadmin con fila existente → subquery devuelve `true` → puede escribir `is_superadmin = true` → sin restricción.
- Usuario nuevo sin fila → subquery devuelve `NULL` → `COALESCE(..., false)` → tratado como no-superadmin → no puede escalarse.
- La restricción aplica solo a `is_superadmin`; el resto de columnas del perfil siguen siendo libremente editables por el propio usuario.

**Efecto secundario conocido:** un superadmin no puede revertir su propio
`is_superadmin` a `false` via `UPDATE profiles` (el WITH CHECK lo bloquearía).
Para degradar a un superadmin se requiere acceso directo a Supabase Dashboard
o una función `SECURITY DEFINER` específica. Este comportamiento es correcto
y deseable.

---

## Bloque 2 — Seed superadmin

**Vulnerabilidad cerrada:** `is_superadmin()` devolvía `false` para todos
los usuarios porque `profiles` estaba vacío. Ninguna operación que requiera
superadmin era ejecutable.

**Fix:**
```sql
INSERT INTO public.profiles (id, is_superadmin)
VALUES ('5e12ace0-05c6-4208-b7c8-8250b7063848', true)
ON CONFLICT (id) DO UPDATE SET is_superadmin = true;
```

**Por qué solo dos columnas:** el resto son todas `NULL`-able sin `DEFAULT`
obligatorio. `is_superadmin` tiene `DEFAULT false` pero se proporciona
explícitamente.

**Idempotencia:** `ON CONFLICT DO UPDATE` garantiza que si el usuario ya
hizo primer login (y por tanto tiene fila en `profiles`), solo se actualiza
`is_superadmin` sin tocar `full_name`, `role`, `department`, etc.

---

## Bloque 3 — `soft_delete()` con auth por fila

**Vulnerabilidad cerrada:** cualquier usuario autenticado podía soft-deletear
filas de cualquier proyecto.

**Lógica de autorización añadida:**

```
1. ¿Tabla en whitelist? → No → RAISE EXCEPTION (sin cambio)
2. ¿is_superadmin()? → Sí → ejecutar y RETURN (fast path)
3. ¿Tabla en ['organizations','workspaces','manufacturers','products']?
   → Sí → RAISE EXCEPTION insufficient_privilege
4. Resolver project_id de la fila (CASE tabla → SELECT/JOIN)
5. ¿project_id IS NULL? → fila no encontrada → RAISE EXCEPTION no_data_found
6. ¿has_project_permission(project_id, 'delete')? → No → RAISE EXCEPTION
7. Ejecutar UPDATE deleted_at = now()
```

**Mapa de resolución de project_id:**

| Tabla | Estrategia |
|---|---|
| bom_lines, requirements, compliance_matrix, rfqs, risks, systems, circulars, project_queries, documents, decisions, project_members | `SELECT project_id FROM public.<tabla> WHERE id = p_id` |
| projects | `v_project_id := p_id` (el objeto es el proyecto) |
| quotes | `SELECT r.project_id FROM quotes q JOIN rfqs r ON r.id = q.rfq_id WHERE q.id = p_id` |
| rfq_lines | `SELECT r.project_id FROM rfq_lines rl JOIN rfqs r ON r.id = rl.rfq_id WHERE rl.id = p_id` |
| organizations, workspaces, manufacturers, products | Denegado salvo superadmin |

**Nota sobre `restore_soft_delete` con filas borradas:** para las tablas
con JOIN (`quotes`, `rfq_lines`), la fila existe con `deleted_at IS NOT NULL`
pero sus columnas de FK (`rfq_id`) siguen accesibles. El `SELECT` con JOIN
funciona correctamente para restauración.

---

## Bloque 4 — `restore_soft_delete()` con auth por fila

Misma lógica que Bloque 3. Requiere el mismo nivel de permiso que borrar
(coherente: quien puede borrar puede restaurar).

---

## Queries de verificación post-aplicación (Fase 2)

Ejecutar en SQL Editor de Supabase después de aplicar los 4 bloques:

```sql
-- 1. profiles_update tiene WITH CHECK
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'UPDATE';
-- Esperado: with_check IS NOT NULL (contiene la expresión COALESCE)

-- 2. Superadmin existe
SELECT id, is_superadmin FROM public.profiles
WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';
-- Esperado: 1 fila, is_superadmin = true

-- 3. is_superadmin() funciona (correr autenticado como el superadmin)
SELECT is_superadmin();
-- Esperado: true

-- 4. Funciones actualizadas incluyen chequeo de permisos
SELECT proname, prosrc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN ('soft_delete','restore_soft_delete');
-- Esperado: ambas incluyen 'has_project_permission' y 'v_masters'

-- 5. Test manual — intento de escalada (correr como usuario NO superadmin)
UPDATE public.profiles SET is_superadmin = true WHERE id = auth.uid();
-- Esperado: ERROR — new row violates WITH CHECK option for "profiles_update"
```

---

## Checklist de aprobación pre-producción

- [ ] Fase 2 ejecutada y todos los checks pasan en staging/dev
- [ ] Test manual de escalada (Query 5 de Fase 2) confirma el bloqueo
- [ ] Superadmin confirmó primer login exitoso después de aplicar Bloque 2
- [ ] Confirmación de que `has_project_permission(uuid, 'delete')` devuelve
      los valores correctos para usuarios de prueba en dev
- [ ] Rollback testeado en entorno dev antes de aplicar en producción
- [ ] Aprobación explícita de responsable de seguridad o tech lead

---

## Fuera de alcance — mejoras futuras

- **Tabla `app_admins`:** mover `is_superadmin` a tabla separada sin policy
  de escritura para usuarios. Más robusto que el `WITH CHECK`, pero requiere
  cambiar `is_superadmin()` y actualizar código que lea `profiles.is_superadmin`.
  Candidato para 0008 o posterior.
- **UI de gestión de superadmins:** panel para promover/degradar superadmins
  sin acceso directo a Supabase Dashboard.
- **Migración 0007:** `transactional_outbox` — fuera de alcance de esta tarea.

---

## Archivos entregados

```
apps/core-bep/supabase/migrations/
├── 0006_security_hardening.sql   ← migración principal (4 bloques)
└── 0006_rollback.sql             ← rollback completo al estado post-0005
MIGRATION-0006-REPORT.md          ← este archivo
```

---

_Autoría: revisión de seguridad post-0005 — 2026-06-27_  
_Estado: pendiente de aprobación humana. NO aplicar a producción sin sign-off._
