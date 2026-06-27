# MIGRATION-0004-REPORT.md

**Migración:** `0004_soft_delete.sql`  
**Estado:** ⏳ Lista para revisión — NO aplicada a producción  
**Fecha de autoría:** 2026-06-27  
**Precondición verificada:** `0003_governance_security` aplicada 2026-06-27  

---

## Fase 0 — Hallazgos de descubrimiento

> **NOTA:** Esta fase requiere ejecución manual en el SQL Editor de Supabase.
> Los queries están incluidos abajo. Los resultados esperados según el ground
> truth verificado también se documentan. **Correr estos queries antes de
> ejecutar la migración y comparar con lo esperado.**

### Queries de Fase 0 a correr manualmente

```sql
-- 1. Policies SELECT actuales (USING exacto de cada una)
SELECT tablename, policyname, qual AS using_expr
FROM pg_policies
WHERE schemaname = 'public' AND cmd = 'SELECT'
ORDER BY tablename;

-- 2. Verificar que deleted_at no existe aún en ninguna tabla
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'deleted_at';

-- 3. Verificar columna id en todas las tablas objetivo
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'id'
AND table_name IN (
  'bom_lines','requirements','compliance_matrix','rfqs','rfq_lines',
  'risks','systems','circulars','project_queries','documents',
  'decisions','quotes','projects','project_members','organizations',
  'workspaces','manufacturers','products'
)
ORDER BY table_name;

-- 4. Policies DELETE actuales (verificar estado post-0003)
SELECT tablename, policyname, qual
FROM pg_policies
WHERE schemaname = 'public' AND cmd = 'DELETE'
ORDER BY tablename;

-- 5. Verificar superadmin flag
SELECT id, is_superadmin FROM public.profiles
WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';
```

### Resultados esperados según ground truth

| Check | Esperado |
|---|---|
| `deleted_at` en alguna tabla | 0 filas (no existe aún) |
| Columna `id` en las 18 tablas objetivo | 18 filas, tipo `uuid` |
| Policy SELECT de `bom_lines` | `is_project_member(project_id)` |
| Policy SELECT de `projects` | `is_project_member(id)` |
| Policy SELECT de `manufacturers` | `(auth.uid() IS NOT NULL)` |
| Policy DELETE de `bom_lines` | `is_superadmin() OR has_delete_role(project_id)` |
| Superadmin `5e12ace0...` | Puede no tener row aún (primer login pendiente) |

### ⚠️ Discrepancias a vigilar antes de ejecutar

1. **Políticas SELECT con nombres distintos a los esperados.** La migración usa
   `DROP POLICY IF EXISTS <nombre>` — si el nombre real es diferente, la policy
   existente quedará activa junto con la nueva (duplicado). Verificar nombres
   exactos en el resultado del query 1.

2. **`decisions` — arquetipo ambiguo.** El documento de diseño no especifica
   explícitamente si `decisions` es Arquetipo A o B. Se trató como A (con
   `has_delete_role`). Si en Fase 0 la policy DELETE de `decisions` ya era solo
   `is_superadmin()`, el Bloque 5 es igualmente correcto (idempotente).

3. **Superadmin sin row en `profiles`.** Si el usuario
   `5e12ace0-05c6-4208-b7c8-8250b7063848` no tiene row, la función
   `is_superadmin()` retorna `false` para él. No afecta esta migración, pero
   registrar para seguimiento.

4. **`organizations` y `workspaces` — USING base.** Se asumió
   `auth.uid() IS NOT NULL` como en el patrón de entidades globales del ground
   truth. Confirmar contra el resultado del query 1.

---

## Fase 1 — Cambios implementados

### Bloque 1 — Columna `deleted_at` (18 tablas)

Columna agregada con `ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL`.

**Tablas con soft delete:**

| Categoría | Tablas |
|---|---|
| Transaccionales | `bom_lines`, `requirements`, `compliance_matrix`, `rfqs`, `rfq_lines`, `risks`, `systems`, `circulars`, `project_queries`, `documents`, `decisions`, `quotes` |
| Entidades maestras | `projects`, `project_members`, `organizations`, `workspaces`, `manufacturers`, `products` |

**Tablas excluidas intencionalmente:**

| Tabla | Razón |
|---|---|
| `profiles` | Manejado por Supabase Auth |
| `lessons_learned` | Conocimiento inmutable, solo DELETE físico por superadmin |
| `entity_links` | Infraestructura, DELETE físico intencional |
| `entity_versions` | Infraestructura, DELETE físico intencional |
| `project_roles` | Configuración estática |

### Bloque 2 — Índices parciales (18 índices)

Índice `idx_<tabla>_deleted_at` en cada tabla con `WHERE deleted_at IS NOT NULL`.

Optimiza queries de papelera. Las queries de activos (`IS NULL`) aprovechan
que el índice es parcial (los activos no están en él, reduciendo su tamaño).

### Bloque 3 — Policies SELECT con filtro (18 policies)

Patrón: DROP de la policy existente + CREATE con `AND deleted_at IS NULL`.

Hace el filtrado automático para todos los clientes sin tocar código de app.

### Bloque 4 — Función `soft_delete(text, uuid)`

- `SECURITY DEFINER`: corre con privilegios del owner
- Whitelist de 18 tablas permitidas (validación explícita antes del `EXECUTE`)
- Lanza `RAISE EXCEPTION` si la tabla no está en whitelist
- Solo afecta registros con `deleted_at IS NULL` (idempotente)
- Permisos: revocado de `PUBLIC`, concedido a `authenticated`

### Bloque 5 — Policies DELETE Arquetipo A (10 tablas)

| Antes (0003) | Después (0004) |
|---|---|
| `is_superadmin() OR has_delete_role(project_id)` | `is_superadmin()` |

El "delete" del usuario pasa a ser soft delete vía `soft_delete()`.
El DELETE físico queda exclusivo de superadmin.

Arquetipo B y C no cambiaron (ya eran solo superadmin).

---

## Fase 2 — Queries de verificación post-aplicación

Correr en el SQL Editor inmediatamente después de aplicar los 5 bloques:

```sql
-- 1. Contar columnas deleted_at (esperado: 18)
SELECT 'deleted_at_columns' AS check, COUNT(*)::text AS result
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'deleted_at';

-- 2. Contar índices parciales (esperado: 18)
SELECT 'partial_indexes' AS check, COUNT(*)::text AS result
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%_deleted_at';

-- 3. Policies SELECT con filtro (esperado: 18)
SELECT 'select_policies_with_filter' AS check, COUNT(*)::text AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'SELECT'
  AND qual LIKE '%deleted_at IS NULL%';

-- 4. Función soft_delete existe (esperado: 1)
SELECT 'soft_delete_fn' AS check, COUNT(*)::text AS result
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'soft_delete';

-- 5. Policy DELETE de bom_lines es solo superadmin
SELECT 'arquetipo_a_delete_policies' AS check, qual AS result
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'DELETE'
  AND tablename = 'bom_lines';
-- Esperado: USING (is_superadmin()) — sin has_delete_role

-- 6. Verificar que tablas excluidas NO tienen deleted_at
SELECT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'deleted_at'
  AND table_name IN ('profiles','lessons_learned','entity_links','entity_versions','project_roles');
-- Esperado: 0 filas

-- 7. Test de idempotencia: re-ejecutar Bloque 1 no debe fallar
-- (correr el BLOQUE 1 nuevamente y verificar que termina sin error)
```

---

## Criterios de aceptación — checklist

- [ ] `deleted_at` existe en las 18 tablas objetivo → query 1 retorna `18`
- [ ] 18 índices parciales creados → query 2 retorna `18`
- [ ] 18 policies SELECT con `AND deleted_at IS NULL` → query 3 retorna `18`
- [ ] Función `soft_delete(text, uuid)` existe → query 4 retorna `1`
- [ ] Policy DELETE de `bom_lines` es solo `is_superadmin()` → query 5 confirmado
- [ ] Tablas excluidas sin `deleted_at` → query 6 retorna `0 filas`
- [ ] Re-ejecución de Bloque 1 no falla (idempotencia)
- [ ] Rollback aplica limpio y restaura estado post-0003

---

## Notas de arquitectura y decisiones

### Por qué no trigger automático en esta migración

La alternativa de interceptar `DELETE` con un trigger y convertirlo en soft
delete fue evaluada y descartada para este paso. Razones:

1. Complejiza el debug — un `DELETE` que no borra es sorprendente
2. Rompe semántica de ON DELETE CASCADE (project_members.project_id → projects)
3. La función `soft_delete()` es más explícita y auditable

Esta decisión puede revisarse en 0005 si el equipo prefiere transparencia total.

### Sobre SECURITY DEFINER en `soft_delete()`

La función usa `SECURITY DEFINER` para poder hacer `UPDATE` en tablas donde
el usuario autenticado tiene permiso de UPDATE vía RLS. La whitelist es la
barrera de seguridad crítica. Si se agregan tablas con soft delete en el
futuro, actualizar la whitelist en la función.

Alternativa más segura evaluada: hacer que la función verifique también la
policy UPDATE del caller. Se decidió no hacerlo en 0004 para mantener
simplicidad; revisar en la SPEC de CRUD granular.

### `decisions` — resolución de ambigüedad

El documento de diseño no especifica el arquetipo de `decisions`. Se trató
como Arquetipo A (con `has_delete_role`) por ser tabla transaccional. Si en
Fase 0 se confirma que era Arquetipo B, el resultado final (solo superadmin)
es igualmente correcto — la diferencia solo afecta el rollback.

---

## Próximos pasos — 0005

- **CRUD de BOM:** UI de escritura para `bom_lines` con soft delete integrado
- **UI de papelera:** listado de registros con `deleted_at IS NOT NULL` y
  acción de restauración (`UPDATE SET deleted_at = NULL`)
- **Trigger review:** evaluar si conviene interceptar `DELETE` en 0006
- **Cleanup enum `project_role`:** tarea independiente, sin bloqueo

---

*Generado por agente de coding — revisión humana requerida antes de aplicar a producción.*
