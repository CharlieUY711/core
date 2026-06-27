# MIGRATION-0003-REPORT.md
**Migración:** `0003_governance_security.sql`  
**Fecha de aplicación:** 2026-06-27  
**Estado:** ✅ Aplicada y verificada en producción  

---

## FASE 0 — Hallazgos de Introspección

### Estado verificado de la base (pre-migración)

| Elemento | Estado encontrado | Coincide con ground truth |
|---|---|---|
| `project_members.role` tipo | `USER-DEFINED` / enum `project_role` | ✅ |
| Default de `role` | `'guest'::project_role` | ✅ |
| Valores del enum `project_role` | 10 valores | ✅ |
| `project_roles` filas | 0 (vacía) | ✅ |
| Policies `ALL` con UUID hardcodeado | 8 policies en 8 tablas | ✅ |
| Policies DELETE | 0 en toda la base | ✅ |
| `profiles.is_superadmin` | No existía | ✅ |
| Función `is_superadmin()` | No existía | ✅ |

### Hallazgos nuevos / discrepancias

**1. `has_project_permission` NO usa el enum**  
Trabaja contra `permissions text[]`, no contra `role`. No requirió modificación para el Cambio 2. El permiso `'delete'` no existe en ningún array `permissions` → los DELETE del Cambio 4 se gatearon por roles elevados.

**2. Nombre de policy en `projects`: `superadmin_bypass`**  
El ground truth no especificaba el nombre exacto. Verificado en Fase 0 y usado correctamente en la migración.

**3. `project_members_select` — única policy con cast al enum**  
`pm2.role = ANY (ARRAY['bid_manager'::project_role, 'pmo'::project_role])` → recreada como texto puro.

---

## FASE 1 — Cambios implementados

### Cambio 1 — Seed de `project_roles` (14 roles)

| id | label | category | sort_order |
|---|---|---|---|
| bid_manager | Bid Manager | internal | 1 |
| director | Director | internal | 2 |
| manager | Gerente | internal | 3 |
| engineer | Ingeniero | internal | 4 |
| procurement | Compras | internal | 5 |
| cost | Control de Costos | internal | 6 |
| pmo | PMO | internal | 7 |
| consultant | Consultor | limited | 8 |
| guest | Invitado | limited | 9 |
| client | Cliente | external | 10 |
| manufacturer | Fabricante | external | 11 |
| distributor | Distribuidor | external | 12 |
| supplier | Proveedor | external | 13 |
| subcontract | Subcontrato | external | 14 |

### Cambio 2 — `project_members.role`: enum → text + FK

- DROP `project_members_select` (dependía del enum)
- `ALTER COLUMN role TYPE text USING role::text`
- `ADD CONSTRAINT fk_project_members_role → project_roles(id)`
- RECREAR `project_members_select` sin cast `::project_role`

### Cambio 3 — Superadmin: UUID → flag en profiles

- `ALTER TABLE profiles ADD COLUMN is_superadmin boolean NOT NULL DEFAULT false`
- `CREATE OR REPLACE FUNCTION public.is_superadmin()` — STABLE, SECURITY DEFINER
- DROP + CREATE de 8 policies `superadmin_*` usando `is_superadmin()`

### Cambio 4 — Policies DELETE (22 policies)

- `CREATE OR REPLACE FUNCTION public.has_delete_role(uuid)` — roles: bid_manager, pmo, director, manager
- 9 policies Arquetipo A: `is_superadmin() OR has_delete_role(project_id)`
- 4 policies Arquetipo B: `is_superadmin()`
- 9 policies Arquetipo C: `is_superadmin()`

---

## FASE 2 — Verificación (resultados reales)

### Nota de aplicación
La migración fue aplicada en bloques separados vía SQL Editor de Supabase. El SQL Editor ejecuta solo el último statement de un bloque multi-statement, por lo que fue necesario correr los 6 bloques individualmente. El script final en `0003_governance_security.sql` refleja esta estructura.

### Checklist de criterios de aceptación

| Check | Esperado | Resultado | Estado |
|---|---|---|---|
| `project_members.role` tipo | `text` | `text` | ✅ |
| `project_roles` filas | 14 | 14 | ✅ |
| FK `fk_project_members_role` existe | 1 | 1 | ✅ |
| Policies DELETE | 22 | 22 | ✅ |
| UUID hardcodeado en policies | 0 | 0 | ✅ |
| Función `is_superadmin()` existe | 1 | 1 | ✅ |
| Función `has_delete_role()` existe | 1 | 1 | ✅ |
| `profiles.is_superadmin` existe | sí | sí | ✅ |
| Superadmin flag activo | true | — | ⚠️ |

### ⚠️ Superadmin flag — acción pendiente
`profiles` estaba vacía al momento de la migración (primer deploy, sin logins previos). El `UPDATE` no afectó ninguna fila. **Acción requerida:** después del primer login del usuario superadmin, ejecutar:

```sql
UPDATE public.profiles
SET is_superadmin = true
WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';
```

---

## CLEANUP FUTURO

### 1. Dropear el enum `project_role`
No fue dropeado en 0003 por precaución. Verificar dependencias y dropear cuando sea seguro:

```sql
-- Verificar dependencias restantes
SELECT pg_describe_object(classid, objid, objsubid) AS dependent
FROM pg_depend d
JOIN pg_type t ON t.oid = d.refobjid
WHERE t.typname = 'project_role' AND d.deptype = 'n';

-- Si no hay dependencias:
DROP TYPE IF EXISTS public.project_role;
```

### 2. Permiso `'delete'` en `permissions text[]`
Los DELETE del Arquetipo A se gatean por roles elevados. Si en el futuro se quiere usar `has_project_permission(project_id, 'delete')`, seedear `'delete'` en el array `permissions` de los miembros con roles bid_manager/pmo/director/manager, o implementarlo vía trigger al asignar esos roles.

### 3. Migración 0004 — Soft delete
Agregar `deleted_at timestamptz` a tablas transaccionales. Requiere modificar todas las queries de lectura (`WHERE deleted_at IS NULL`) y actualizar la UI.

---

## ARCHIVOS

```
apps/core-bep/supabase/migrations/
├── 0003_governance_security.sql   ← migración principal (6 bloques)
├── 0003_rollback.sql              ← rollback completo (5 bloques)
└── MIGRATION-0003-REPORT.md       ← este archivo
```
