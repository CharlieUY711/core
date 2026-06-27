# MIGRATION-0005-REPORT.md

**Migración:** `0005_bom_crud.sql`
**Estado:** ✅ Aplicada y verificada 2026-06-27
**Precondición:** `0004_soft_delete` aplicada 2026-06-27

---

## Fase 0 — Hallazgos

`bom_lines` estaba más completa de lo esperado por el diseño de 0005:

| Check | Resultado |
|---|---|
| Columnas | ✅ Todas presentes (19 columnas incluyendo `deleted_at`) |
| Enum `bom_line_status` | ✅ 7 valores: `draft`, `under_review`, `approved`, `rfq_sent`, `quoted`, `ordered`, `delivered` |
| Policy INSERT | ✅ `has_project_permission(project_id, 'write')` |
| Policy SELECT | ✅ `is_project_member(project_id) AND deleted_at IS NULL` |
| Policy UPDATE | ✅ `has_project_permission(project_id, 'write')` |
| Policy DELETE | ✅ `is_superadmin()` |
| Policy ALL superadmin | ✅ `superadmin_bom` → `is_superadmin()` |
| Trigger `updated_at` | ✅ `trg_bom_lines_updated_at` → `update_updated_at()` |
| `restore_soft_delete` | ❌ No existía → creada en esta migración |

**Conclusión:** 0005 se redujo a un único bloque — la función `restore_soft_delete()`.

---

## Cambios aplicados

### Función `restore_soft_delete(p_table text, p_id uuid)`

Complemento de `soft_delete()` introducida en 0004. Restaura registros
soft-deleted poniendo `deleted_at = NULL`.

- `SECURITY DEFINER`: corre con privilegios del owner
- Whitelist idéntica a `soft_delete()`: 18 tablas
- Solo afecta filas con `deleted_at IS NOT NULL` (idempotente)
- Permisos: revocado de `PUBLIC`, concedido a `authenticated`

---

## Verificación

```sql
SELECT proname, prosecdef
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname IN ('soft_delete', 'restore_soft_delete');
```

Resultado: 2 filas, `prosecdef = true` en ambas ✅

---

## Estado del par soft delete / restore

| Función | Estado |
|---|---|
| `public.soft_delete(text, uuid)` | ✅ Desde 0004 |
| `public.restore_soft_delete(text, uuid)` | ✅ Desde 0005 |

---

## Próximos pasos — 0006

`transactional_outbox` — pendiente diseño.
