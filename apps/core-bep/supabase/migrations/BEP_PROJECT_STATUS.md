# Estado completo del proyecto BEP — Migraciones
_Última actualización: 2026-06-27_

---

## ✅ Completadas

| Migración | Nombre | Estado | Reporte |
|---|---|---|---|
| 0001 | `initial_schema` | ✅ Aplicada (pre-existente) | — |
| 0002 | `storage_and_functions` | ✅ Aplicada (pre-existente) | — |
| 0003 | `governance_security` | ✅ Aplicada y verificada 2026-06-27 | `MIGRATION-0003-REPORT.md` |
| 0004 | `soft_delete` | ✅ Aplicada y verificada 2026-06-27 | `MIGRATION-0004-REPORT.md` |
| 0005 | `bom_crud` | ✅ Aplicada y verificada 2026-06-27 | `MIGRATION-0005-REPORT.md` |

### Resumen de lo que dejó 0004
- `deleted_at timestamptz DEFAULT NULL` en 18 tablas
- 18 índices parciales `idx_<tabla>_deleted_at WHERE deleted_at IS NOT NULL`
- 18 policies SELECT con filtro `AND deleted_at IS NULL`
- Función `public.soft_delete(p_table text, p_id uuid)` con whitelist de 18 tablas
- Policies DELETE de Arquetipo A reducidas a `is_superadmin()` únicamente
- Bug de 0003 corregido: `project_members`, `organizations`, `workspaces`, `quotes`, `rfq_lines` ahora tienen SELECT policy

### Resumen de lo que dejó 0005
- Función `public.restore_soft_delete(p_table text, p_id uuid)` — complemento de `soft_delete()`
- `bom_lines` tenía todas las columnas, policies y trigger ya presentes (pre-existentes)
- Enum `bom_line_status` documentado: `draft`, `under_review`, `approved`, `rfq_sent`, `quoted`, `ordered`, `delivered`
- Función `update_updated_at()` y trigger `trg_bom_lines_updated_at` confirmados

### Par soft delete disponible para toda la app
| Función | Descripción |
|---|---|
| `public.soft_delete(text, uuid)` | Marca `deleted_at = now()` |
| `public.restore_soft_delete(text, uuid)` | Restaura `deleted_at = NULL` |

---

## 🔜 Próximas

| Migración | Nombre | Estado | Prompt |
|---|---|---|---|
| 0006 | `transactional_outbox` | 🔲 Pendiente diseño | — |

---

## 🧹 Cleanup técnico pendiente

| Tarea | Depende de | Notas |
|---|---|---|
| Dropear enum `project_role` | Verificar cero dependencias | Query lista en `MIGRATION-0003-REPORT.md` |
| Seedear `is_superadmin = true` para el superadmin | Primer login del usuario `5e12ace0-05c6-4208-b7c8-8250b7063848` | `UPDATE public.profiles SET is_superadmin = true WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848'` |
| Permiso `'delete'` en `permissions[]` | Decisión de negocio | Hoy gateado por roles; futuro: via `has_project_permission` |

---

## 🔮 Futuro / SPEC pendiente

| Feature | Notas |
|---|---|
| UI de papelera / restauración | Usar `restore_soft_delete()` desde el cliente |
| Permisos granulares por marca/disciplina | SPEC no escrita |
| Trigger DELETE → soft delete automático | Decisión de arquitectura pendiente |
