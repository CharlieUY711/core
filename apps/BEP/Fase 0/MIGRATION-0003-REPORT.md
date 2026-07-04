# MIGRATION-0003-REPORT.md
**Migración:** `0003_governance_security.sql`  
**Fecha:** 2026-06-27  
**Estado:** ⏳ Pendiente de aprobación — NO aplicada a producción  

---

## FASE 0 — Hallazgos de Introspección

### Estado verificado de la base (pre-migración)

| Elemento | Estado encontrado | Coincide con ground truth |
|---|---|---|
| `project_members.role` tipo | `USER-DEFINED` / enum `project_role` | ✅ |
| Default de `role` | `'guest'::project_role` | ✅ |
| Valores del enum `project_role` | 10 valores (bid_manager, engineer, procurement, cost, pmo, client, manufacturer, supplier, consultant, guest) | ✅ |
| `project_roles` filas | 0 (vacía) | ✅ |
| Policies `ALL` con UUID hardcodeado | 8 policies en 8 tablas | ✅ |
| Policies DELETE | 0 en toda la base | ✅ |
| `profiles.is_superadmin` | No existe | ✅ |
| Función `is_superadmin()` | No existe | ✅ |

### Discrepancias y hallazgos nuevos

#### 1. `has_project_permission` — NO depende del enum (importante)
```sql
-- Cuerpo real de la función:
SELECT EXISTS (
  SELECT 1 FROM project_members
  WHERE project_id = p_project_id
    AND user_id = auth.uid()
    AND p_action = ANY(permissions)  -- ← usa permissions text[], no role
);
```
**Impacto:** La función NO necesita modificación para el Cambio 2. Sin embargo, el permiso `'delete'` no existe en ningún array `permissions` actual → los DELETE del Cambio 4 se gatean por roles elevados (`bid_manager`, `pmo`, `director`, `manager`).

#### 2. Policy `superadmin_bypass` en `projects` (nombre no estándar)
El ground truth listaba las 8 tablas pero no especificaba el nombre exacto de la policy de `projects`. El nombre real es `superadmin_bypass` (no `superadmin_projects`). La migración usa el nombre exacto verificado.

#### 3. `is_project_member` — no toca `role`, sin cambios necesarios
```sql
SELECT EXISTS (
  SELECT 1 FROM project_members
  WHERE project_id = p_project_id AND user_id = auth.uid()
);
```

#### 4. Única dependencia del enum en policies: `project_members_select`
```sql
-- BEFORE (depende del enum):
pm2.role = ANY (ARRAY['bid_manager'::project_role, 'pmo'::project_role])

-- AFTER (texto puro):
pm2.role = ANY (ARRAY['bid_manager', 'pmo'])
```

#### 5. Tablas en Cambio 4 sin policy previa de ningún tipo
`circulars` y `systems` solo tenían SELECT e INSERT — sin UPDATE ni superadmin ALL. Se agregan únicamente las policies DELETE correspondientes.

---

## CAMBIOS IMPLEMENTADOS

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

**Secuencia:**
1. DROP de `project_members_select` (única policy con cast al enum)
2. DROP DEFAULT → ALTER TYPE text USING role::text → SET DEFAULT 'guest'
3. DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT `fk_project_members_role` → `project_roles(id)`
4. CREATE POLICY `project_members_select` con `role = ANY (ARRAY['bid_manager', 'pmo'])` (sin cast)

**FK creada:** `fk_project_members_role` → `public.project_roles(id)`

### Cambio 3 — Superadmin: UUID hardcodeado → flag en profiles

**Infraestructura nueva:**
- Columna: `profiles.is_superadmin boolean NOT NULL DEFAULT false`
- Seed: `UPDATE profiles SET is_superadmin = true WHERE id = '5e12ace0-...'`
- Función: `public.is_superadmin()` — STABLE, SECURITY DEFINER, search_path fijo

**8 policies reemplazadas** (DROP + CREATE con mismo nombre):

| Tabla | Policy | Antes | Después |
|---|---|---|---|
| bom_lines | superadmin_bom | `auth.uid() = '5e12...'` | `is_superadmin()` |
| compliance_matrix | superadmin_compliance | `auth.uid() = '5e12...'` | `is_superadmin()` |
| documents | superadmin_documents | `auth.uid() = '5e12...'` | `is_superadmin()` |
| project_members | superadmin_members | `auth.uid() = '5e12...'` | `is_superadmin()` |
| projects | superadmin_bypass | `auth.uid() = '5e12...'` | `is_superadmin()` |
| requirements | superadmin_requirements | `auth.uid() = '5e12...'` | `is_superadmin()` |
| rfqs | superadmin_rfqs | `auth.uid() = '5e12...'` | `is_superadmin()` |
| risks | superadmin_risks | `auth.uid() = '5e12...'` | `is_superadmin()` |

### Cambio 4 — Policies de DELETE (27 policies nuevas)

**Función helper creada:** `public.has_delete_role(p_project_id uuid)`  
Roles con permiso de delete en proyecto: `bid_manager`, `pmo`, `director`, `manager`

| Arquetipo | Tablas | Condición DELETE |
|---|---|---|
| A — Transaccionales | bom_lines, requirements, compliance_matrix, rfqs, risks, systems, circulars, project_queries, documents | `is_superadmin() OR has_delete_role(project_id)` |
| B — Inmutables | decisions, lessons_learned, entity_versions, entity_links | `is_superadmin()` |
| C — Config/superior | projects, project_members, organizations, workspaces, profiles, manufacturers, products, quotes, rfq_lines | `is_superadmin()` |

---

## CRITERIOS DE ACEPTACIÓN — Checklist post-aplicación

Correr en SQL Editor después de aplicar en branch/shadow:

```sql
-- 1. Tipo de role debe ser text
SELECT udt_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'project_members' AND column_name = 'role';
-- Esperado: text

-- 2. project_roles debe tener 14 filas
SELECT COUNT(*) FROM public.project_roles;
-- Esperado: 14

-- 3. FK debe existir
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'project_members' AND constraint_name = 'fk_project_members_role';
-- Esperado: fk_project_members_role

-- 4. Policies DELETE deben existir
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND cmd = 'DELETE';
-- Esperado: 27

-- 5. Ninguna policy con UUID hardcodeado
SELECT COUNT(*) FROM pg_policies
WHERE schemaname = 'public' AND qual LIKE '%5e12ace0%';
-- Esperado: 0

-- 6. is_superadmin() existe
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'is_superadmin';
-- Esperado: is_superadmin

-- 7. profiles.is_superadmin existe y el usuario tiene el flag
SELECT is_superadmin FROM public.profiles
WHERE id = '5e12ace0-05c6-4208-b7c8-8250b7063848';
-- Esperado: true

-- 8. Idempotencia: correr la migración 2 veces no falla
-- (ejecutar 0003_governance_security.sql por segunda vez y verificar que no hay errores)
```

---

## SMOKE TEST (a realizar en branch/shadow)

| Escenario | Acción | Resultado esperado |
|---|---|---|
| Miembro normal del proyecto | SELECT en bom_lines | ✅ Permitido |
| Miembro normal | INSERT en bom_lines con permiso 'write' | ✅ Permitido |
| Miembro normal | DELETE en bom_lines | ❌ Bloqueado |
| Rol bid_manager en proyecto | DELETE en bom_lines | ✅ Permitido |
| Rol guest en proyecto | DELETE en bom_lines | ❌ Bloqueado |
| Usuario sin proyecto | SELECT en bom_lines | ❌ Bloqueado |
| Superadmin (is_superadmin=true) | DELETE en decisions | ✅ Permitido |
| Usuario no superadmin | DELETE en decisions | ❌ Bloqueado |
| Superadmin | SELECT en cualquier tabla | ✅ Permitido |

---

## CLEANUP FUTURO (fuera de alcance de 0003)

### Dropear el enum `project_role`
El enum **no fue dropeado** en esta migración por precaución — puede tener dependencias no visibles (funciones, triggers, otros schemas). Una vez confirmado que no hay dependencias restantes:

```sql
-- Verificar dependencias antes de dropear:
SELECT pg_describe_object(classid, objid, objsubid) AS dependent
FROM pg_depend d
JOIN pg_type t ON t.oid = d.refobjid
WHERE t.typname = 'project_role'
  AND d.deptype = 'n';

-- Si el resultado es vacío, es seguro dropear:
DROP TYPE IF EXISTS public.project_role;
```

### Permiso `'delete'` en `permissions text[]`
Actualmente los DELETE del Cambio 4 (Arquetipo A) se gatean por roles elevados. En el futuro, si se quiere usar `has_project_permission(project_id, 'delete')`, hay que seedear `'delete'` en el array `permissions` de los miembros con roles bid_manager/pmo/director/manager, o hacerlo automático vía trigger al asignar esos roles.

### Migración 0004 — Soft delete
Agregar `deleted_at timestamptz` a las tablas transaccionales. Requiere modificar todas las queries de lectura para filtrar `WHERE deleted_at IS NULL`.

---

## ARCHIVOS ENTREGADOS

```
C:\CORE\apps\BEP\Fase 0\
├── 0003_governance_security.sql   ← migración principal
├── 0003_rollback.sql              ← rollback completo
└── MIGRATION-0003-REPORT.md       ← este archivo
```

**Estado:** Pendiente de revisión y aprobación humana antes de aplicar a producción.
