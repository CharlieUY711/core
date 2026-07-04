# ROADMAP-000-FOUNDATION

**Producto:** CORE Roadmap
**Tipo:** Aplicación del ecosistema CORE (`apps/core-roadmap`)
**Estado del documento:** Fundación / aprobación de arquitectura
**Autor del rol:** Principal Software Architect + Product Manager
**Versión:** 0.1.0 (Foundation)

---

## Nota previa sobre ubicación en el monorepo

Aunque el pedido nombra a CORE Roadmap como *"herramienta"*, su naturaleza es la de un **producto de usuario final con UI, navegación, permisos y backend propio**. En la convención del monorepo CORE, `tools/*` está reservado para tooling de build, scripts y CLIs internos, mientras que `apps/*` aloja aplicaciones desplegables.

Por lo tanto la decisión arquitectónica es:

```
C:\CORE
└── apps/
    └── core-roadmap/
```

Esto es consistente con la regla del documento oficial: *"Si se agrega una nueva aplicación o herramienta, debe ubicarse dentro de `apps/*` o `tools/*` para ser detectada automáticamente por el workspace."* No se introduce infraestructura nueva: se reutiliza el patrón de despliegue de Vercel por filtros (`pnpm --filter core-roadmap build`, output `apps/core-roadmap/dist`) y la base Supabase existente.

---

## 1. Visión del producto

CORE Roadmap es la **plataforma de gobierno, planificación y ejecución** del ecosistema CORE. No es un tablero de tareas: es la **fuente única de verdad** que conecta la estrategia con el código y con el despliegue real.

El problema que resuelve es la fractura típica en un monorepo con múltiples aplicaciones: la estrategia vive en documentos, la planificación en una herramienta, la ejecución en GitHub y el despliegue en Vercel, sin trazabilidad entre capas. CORE Roadmap colapsa esas capas en un solo eje:

> **Estrategia → Roadmap (fases ROADMAP-NNN) → Iniciativas/Épicas → Ejecución (issues/PRs en GitHub) → Despliegue (Vercel/Supabase)**

La visión a largo plazo es que CORE Roadmap sea, primero, el sistema operativo de gobierno interno de CORE; y segundo, un **producto SaaS independiente** para organizaciones de ingeniería que operan monorepos y necesitan trazabilidad de extremo a extremo entre decisión de producto y entrega técnica.

Un concepto distintivo y nativo del producto: las propias **unidades ROADMAP-NNN** (como este `ROADMAP-000-FOUNDATION`) son entidades de primera clase dentro del sistema. CORE Roadmap gestiona, versiona, encadena y audita estos documentos de fase como artefactos de gobierno, no como archivos sueltos.

---

## 2. Objetivos

**Objetivos de producto (qué debe lograr):**

1. Ser la fuente única de verdad del roadmap de todo el ecosistema CORE.
2. Garantizar trazabilidad bidireccional entre decisión estratégica y artefacto de código.
3. Formalizar el ciclo de gobierno mediante fases ROADMAP-NNN versionadas, encadenadas y auditables.
4. Reducir el trabajo manual de planificación mediante asistencia de IA (redacción, estimación, resumen, generación de prompts de continuación).
5. Nacer multi-tenant y reutilizable, para habilitar su comercialización como SaaS sin re-arquitectura.

**Objetivos de arquitectura (cómo debe construirse):**

1. Respetar 100% la arquitectura CORE: pnpm workspaces, `workspace:*`, lockfile único, despliegue por filtros en Vercel.
2. No inventar infraestructura: reutilizar Supabase como backend y los paquetes compartidos.
3. Aislamiento estricto de datos por tenant mediante Row Level Security (RLS) de Supabase.
4. Cero secretos en variables de entorno dispersas: toda credencial se resuelve vía ApiVault.
5. Capa de proveedores de IA agnóstica (Anthropic/OpenAI intercambiables).

**Métricas de éxito (North Star y soporte):**

- North Star: % de issues/PRs de GitHub vinculados a una iniciativa del roadmap.
- Soporte: tiempo medio entre creación de una iniciativa y su primer artefacto de código; % de fases ROADMAP-NNN cerradas con sus dependencias resueltas.

---

## 3. Usuarios

CORE Roadmap distingue **personas internas** (uso dentro de CORE) de **personas SaaS** (clientes externos), que comparten el mismo modelo pero con distinto alcance de tenant.

| Persona | Contexto | Necesidad principal |
|---|---|---|
| Architect / Product Owner | Interno CORE | Definir visión, fases ROADMAP-NNN, gobernar dependencias entre apps |
| Tech Lead | Interno CORE | Traducir iniciativas a épicas y vincularlas a GitHub |
| Developer | Interno CORE | Ver qué construir, con qué prioridad, y reportar avance sin doble carga |
| Stakeholder / Ejecutivo | Interno CORE | Visibilidad de alto nivel: estado, riesgos, fechas, OKRs |
| Org Admin (SaaS) | Cliente externo | Crear workspace, gestionar miembros, conectar su GitHub/Supabase/IA |
| Org Member (SaaS) | Cliente externo | Operar dentro de su tenant según su rol |
| Integración / Bot | Sistema | Sincronizar webhooks de GitHub, ejecutar jobs de IA |

---

## 4. Casos de uso

**Gobierno y planificación**

- Crear una fase de gobierno ROADMAP-NNN, definir su objetivo, sus dependencias con fases anteriores y su criterio de cierre.
- Encadenar fases: ROADMAP-000 habilita ROADMAP-001, que a su vez genera un *prompt de continuación* asistido por IA.
- Definir OKRs / objetivos y colgar iniciativas de ellos.
- Visualizar el roadmap por horizonte temporal (now / next / later) y por aplicación CORE afectada (`core-market`, `core-dashboard`, etc.).

**Ejecución y trazabilidad**

- Convertir una iniciativa en una épica y desglosarla en ítems que se materializan como issues de GitHub.
- Vincular un PR de GitHub a una iniciativa y ver el avance de la iniciativa actualizarse automáticamente al mergear.
- Detectar iniciativas "huérfanas" (sin código asociado) y código "huérfano" (PRs sin iniciativa).

**Asistencia por IA**

- Generar el borrador de una nueva iniciativa a partir de una descripción libre.
- Resumir la actividad de GitHub de la semana para un stakeholder.
- Estimar esfuerzo/riesgo de una épica a partir de su descripción y de su historial.
- Generar automáticamente el *prompt de continuación* para la siguiente fase ROADMAP-NNN.

**Administración (SaaS)**

- Onboarding de un nuevo workspace y conexión de credenciales (GitHub, Supabase, proveedor de IA) vía ApiVault.
- Gestión de miembros y roles.
- Auditoría: quién cambió qué y cuándo.

---

## 5. Arquitectura funcional

CORE Roadmap se organiza en **capacidades funcionales** (qué hace), independientes de su implementación:

1. **Governance Engine** — gestión de fases ROADMAP-NNN: estados, dependencias, encadenamiento, criterios de cierre y versionado.
2. **Planning** — OKRs, iniciativas, épicas, milestones, horizontes (now/next/later) y vistas de roadmap.
3. **Execution Bridge** — vinculación bidireccional con GitHub (issues, PRs, milestones) y derivación de estado.
4. **Insights** — métricas, riesgos, trazabilidad estrategia↔código, detección de huérfanos.
5. **AI Assist** — redacción, resumen, estimación y generación de prompts de continuación.
6. **Identity & Access** — autenticación, tenancy, roles y permisos.
7. **Audit & Compliance** — registro inmutable de cambios.
8. **Notifications** — eventos hacia usuarios y canales (en fase posterior).

Estas capacidades se exponen al usuario a través de los módulos descritos en la sección 7 y se apoyan técnicamente en la sección 6.

---

## 6. Arquitectura técnica

CORE Roadmap es una SPA desplegada por Vercel, con Supabase como backend, totalmente alineada al patrón del monorepo.

**Frontend (`apps/core-roadmap`)**

- SPA con build que produce `apps/core-roadmap/dist` (consistente con el `outputDirectory` de `core-market`).
- Construido sobre el shell y los componentes compartidos, sin reinventar layout, theming ni i18n.

**Backend**

- **Supabase** (existente) como única plataforma backend: PostgreSQL + Auth + Edge Functions + Storage + Realtime.
- Lógica de servidor (webhooks de GitHub, jobs de IA) en **Edge Functions**, no en infraestructura nueva.
- Aislamiento por tenant mediante **RLS** sobre la columna `workspace_id`.

**Consumo de paquetes del workspace (todos vía `workspace:*`):**

| Paquete | Rol en CORE Roadmap |
|---|---|
| `@core-shell` | Layout, chrome de navegación, routing base, montaje de la app |
| `@core-auth` | Autenticación, sesión, contexto de usuario y tenant |
| `@core-apivault` | Resolución de todas las credenciales (GitHub, IA, claves de servicio) |
| `@core-bep-supabase` | Capa canónica de acceso a Supabase (cliente tipado, queries, RLS-aware) |
| `@core-ui` | Componentes de interfaz |
| `@core-design` | Tokens de diseño, tema visual |
| `@core-i18n` | Internacionalización (clave para SaaS) |

**Paquetes propios nuevos (dentro de `packages/*`, opcionales para reuso):**

- `@core/roadmap-domain` — tipos y reglas de dominio (entidades ROADMAP-NNN, iniciativa, épica), reutilizable por otras apps que quieran leer el roadmap.
- `@core/roadmap-github` — adaptador de integración GitHub (si se decide compartirlo).

Estos paquetes se referencian con `workspace:*`, nunca con `file:../../packages/...`, respetando la regla del lockfile único.

**Despliegue (sin nueva infraestructura):**

```jsonc
// vercel.json del proyecto (mismo patrón que core-market)
{
  "installCommand": "corepack enable && pnpm install --frozen-lockfile",
  "buildCommand": "pnpm --filter core-roadmap build",
  "outputDirectory": "apps/core-roadmap/dist",
  "regions": ["iad1"]
}
```

Root Directory de Vercel permanece **vacío** (raíz del repo), como exige la configuración oficial.

---

## 7. Modelo de módulos

Módulos funcionales internos de la aplicación (cada uno es una unidad de UI + dominio):

1. **Governance** — listado y detalle de fases ROADMAP-NNN, grafo de dependencias, criterios de cierre, encadenamiento a la siguiente fase.
2. **Roadmap** — vistas por horizonte (now/next/later), por app CORE, por timeline; arrastrar/priorizar.
3. **Initiatives & Epics** — CRUD de iniciativas y épicas, desglose, estimación.
4. **OKRs** — objetivos y resultados clave, vinculación con iniciativas.
5. **Execution** — vista de issues/PRs vinculados, estado derivado, detección de huérfanos.
6. **Insights** — dashboards de métricas, riesgos y trazabilidad.
7. **AI Studio** — panel de acciones asistidas por IA (redactar, resumir, estimar, generar prompt de continuación).
8. **Integrations** — conexión y estado de GitHub / Supabase / proveedor de IA (vía ApiVault).
9. **Members & Roles** — gestión de miembros y permisos del workspace.
10. **Settings** — configuración del workspace, idioma, branding (SaaS).
11. **Audit** — historial inmutable de cambios.

---

## 8. Modelo de navegación

Navegación montada sobre `@core-shell`, con barra lateral primaria y contexto de workspace en el encabezado.

```
[Workspace Switcher]  ───────────────────────────  [Usuario / Sesión]

Sidebar primaria:
├── Inicio (overview del workspace)
├── Governance (ROADMAP-NNN)
│     └── /governance/:phaseId
├── Roadmap
│     ├── Now / Next / Later
│     └── Timeline
├── Initiatives
│     └── /initiatives/:id  → Épicas → Ítems → (Issues/PRs)
├── OKRs
├── Execution
├── Insights
├── AI Studio
└── Administración
      ├── Integrations
      ├── Members & Roles
      ├── Audit
      └── Settings
```

Principios de IA de navegación:
- **Profundidad jerárquica clara:** Fase → Iniciativa → Épica → Ítem → Artefacto de GitHub.
- **Contexto de tenant siempre visible** (workspace switcher persistente).
- **Rutas estables** para deep-linking y para que otras apps CORE enlacen entidades del roadmap.

---

## 9. Integración con GitHub

**Propósito:** convertir GitHub en la capa de ejecución del roadmap, con sincronización bidireccional.

- **Autenticación:** GitHub App (preferida sobre OAuth personal por permisos finos y webhooks). El token/installation se almacena **en ApiVault**, nunca en variables de entorno ni en la base de datos en claro.
- **Entidades sincronizadas:** repositorios, issues, pull requests, milestones, labels y (opcional) GitHub Projects.
- **Dirección saliente (CORE Roadmap → GitHub):** al crear un ítem de una épica, se puede generar el issue correspondiente con labels que codifican la fase y la iniciativa.
- **Dirección entrante (GitHub → CORE Roadmap):** webhooks recibidos por una **Edge Function de Supabase** actualizan el estado de los ítems (PR abierto, en review, mergeado → iniciativa avanza).
- **Trazabilidad:** convención de vinculación (referencia de la iniciativa en el cuerpo del issue/PR) más mapeo persistido en la base, para detectar huérfanos en ambos sentidos.
- **Multi-tenant:** cada workspace conecta su propia instalación de GitHub; el aislamiento se garantiza con RLS por `workspace_id`.

---

## 10. Integración con Supabase

Supabase es el **único backend**, consumido siempre a través de `@core-bep-supabase`.

- **PostgreSQL** como almacén principal: workspaces, miembros, fases, iniciativas, épicas, ítems, vínculos GitHub, OKRs, auditoría.
- **Auth:** delegado en `@core-auth`, que se apoya en Supabase Auth; CORE Roadmap no implementa autenticación propia.
- **RLS:** toda tabla con datos de tenant lleva `workspace_id` y políticas que filtran por la membresía del usuario autenticado. Es el pilar del aislamiento SaaS.
- **Edge Functions:** webhooks de GitHub, ejecución de jobs de IA, tareas programadas (recálculo de métricas).
- **Realtime:** actualización en vivo de tableros cuando cambian issues/PRs o avanza una iniciativa.
- **Storage:** adjuntos de fases ROADMAP-NNN y exportaciones.

No se crea base de datos ni servicio nuevo: se reutiliza el proyecto Supabase del ecosistema, extendiendo el esquema con tablas propias del dominio Roadmap (a definir en ROADMAP-001).

---

## 11. Integración con ApiVault

ApiVault (`@core-apivault`) es la **única fuente de credenciales** del producto. CORE Roadmap nunca lee secretos desde `.env` dispersos ni los persiste en claro.

- **Qué guarda:** token/installation de GitHub App, claves de proveedores de IA (Anthropic/OpenAI), claves de servicio de Supabase, y cualquier credencial de integración futura.
- **Alcance por tenant:** las credenciales se resuelven por `workspace_id`, de modo que cada cliente SaaS usa sus propias claves.
- **Patrón de uso:** los módulos (GitHub, AI Studio) solicitan la credencial a ApiVault en el momento de uso, idealmente desde Edge Functions, evitando exponer secretos al frontend.
- **Rotación y revocación:** centralizadas en ApiVault; CORE Roadmap no implementa gestión de secretos propia.

---

## 12. Integración con Anthropic / OpenAI

La capa de IA es **agnóstica de proveedor** para permitir intercambiar Anthropic y OpenAI sin tocar el dominio.

- **Adaptador de proveedor:** una interfaz común (`generate`, `summarize`, `estimate`) con implementaciones para Anthropic y OpenAI; el proveedor activo se configura por workspace.
- **Credenciales:** siempre vía ApiVault, por tenant.
- **Ejecución del lado servidor:** las llamadas a los modelos se hacen desde **Edge Functions**, para no exponer claves al cliente y para controlar costos/cuotas.
- **Casos asistidos:**
  - Redactar borradores de iniciativas/épicas a partir de texto libre.
  - Resumir actividad de GitHub para stakeholders.
  - Estimar esfuerzo/riesgo de una épica.
  - **Generar el prompt de continuación** de la siguiente fase ROADMAP-NNN (función nativa del Governance Engine).
- **Gobernanza de IA:** trazabilidad de qué prompt generó qué artefacto, límites de uso por workspace y registro en auditoría.

---

## 13. Modelo de permisos

Modelo **multi-tenant basado en roles**, aplicado en dos capas: lógica de aplicación (UI) y RLS de Supabase (defensa de datos). El alcance siempre está acotado por `workspace_id`.

**Roles:**

| Rol | Gobierno (ROADMAP-NNN) | Roadmap/Iniciativas | Integraciones/Credenciales | Miembros/Roles | Auditoría |
|---|---|---|---|---|---|
| Owner | Total | Total | Total | Total | Lectura |
| Admin | Total | Total | Total | Gestionar (no Owner) | Lectura |
| Architect | Crear/cerrar fases | Total | Lectura | — | Lectura |
| Maintainer | Lectura | Crear/editar | — | — | — |
| Contributor | Lectura | Editar asignados | — | — | — |
| Viewer | Lectura | Lectura | — | — | — |

**Principios:**
- Autenticación e identidad delegadas en `@core-auth`.
- Cada operación sensible se valida también a nivel de base con RLS (no solo en la UI).
- Las credenciales (ApiVault) son visibles/gestionables solo por Owner/Admin.
- Registro en auditoría de toda acción que cambie gobierno, permisos o integraciones.

---

## 14. Roadmap interno del producto

El propio producto se construye mediante fases ROADMAP-NNN encadenadas (dogfooding del Governance Engine):

- **ROADMAP-000 — Foundation** *(este documento)*: visión, arquitectura funcional y técnica, decisiones de plataforma. **Criterio de cierre:** arquitectura aprobada y ubicación en monorepo confirmada.
- **ROADMAP-001 — Core Schema & Data Model**: modelo de datos, esquema Supabase, políticas RLS, contratos de dominio en `@core/roadmap-domain`. **Criterio de cierre:** esquema y RLS revisados.
- **ROADMAP-002 — App Scaffold & Shell Integration**: scaffolding de `apps/core-roadmap`, integración con `@core-shell`, `@core-auth`, `@core-ui`, `@core-design`, `@core-i18n`; despliegue base en Vercel.
- **ROADMAP-003 — Governance & Planning MVP**: módulos Governance, Roadmap, Initiatives, OKRs.
- **ROADMAP-004 — GitHub Execution Bridge**: GitHub App, webhooks, sincronización bidireccional, detección de huérfanos.
- **ROADMAP-005 — AI Studio**: adaptador de proveedores, casos asistidos, generación de prompts de continuación.
- **ROADMAP-006 — Insights & Audit**: métricas, riesgos, trazabilidad, auditoría.
- **ROADMAP-007 — Multi-tenant Hardening**: aislamiento, cuotas, onboarding de workspace.
- **ROADMAP-008 — SaaS Readiness**: billing, planes, branding, internacionalización completa.

---

## 15. Estrategia SaaS

CORE Roadmap nace **multi-tenant** para evitar re-arquitectura al comercializarlo.

- **Modelo de tenancy:** un solo despliegue, aislamiento lógico por `workspace_id` con RLS. CORE opera como un tenant más (dogfooding).
- **Onboarding self-service:** crear workspace, invitar miembros, conectar GitHub/Supabase/IA vía ApiVault con credenciales propias del cliente.
- **Empaquetado por planes (hipótesis inicial):**
  - *Team* — gobierno + planning + GitHub bridge, límite de miembros.
  - *Business* — + AI Studio (con cuotas), Insights, auditoría.
  - *Enterprise* — SSO vía `@core-auth`, branding, cuotas ampliadas, soporte.
- **Diferenciador de mercado:** trazabilidad nativa estrategia↔código↔despliegue para organizaciones que operan monorepos, con gobierno formal mediante fases versionadas — algo que las herramientas de roadmap generalistas no ofrecen.
- **Reutilización:** al estar construido sobre los paquetes compartidos de CORE, el costo marginal de mantenerlo como producto separado es bajo; la i18n (`@core-i18n`) habilita expansión internacional desde el inicio.
- **Riesgos y mitigaciones:** costo de IA (cuotas por workspace y ejecución en servidor); límites de rate de GitHub (GitHub App + caché); soberanía de datos (regiones de Supabase/Vercel por cliente en Enterprise).

---

## Decisiones de arquitectura registradas (ADR resumidos)

- **ADR-001:** CORE Roadmap se ubica en `apps/core-roadmap`, no en `tools/`, por ser un producto de usuario final.
- **ADR-002:** No se introduce infraestructura nueva; backend = Supabase existente; despliegue = patrón Vercel por filtros.
- **ADR-003:** Dependencias internas siempre con `workspace:*`; prohibido `file:../../...`; lockfile único en raíz.
- **ADR-004:** Toda credencial se resuelve vía ApiVault; cero secretos en `.env` dispersos.
- **ADR-005:** Aislamiento multi-tenant mediante RLS por `workspace_id` desde el día uno.
- **ADR-006:** Capa de IA agnóstica de proveedor (Anthropic/OpenAI intercambiables), ejecutada en Edge Functions.

---

## Criterio de cierre de ROADMAP-000

Esta fase se considera cerrada cuando:
1. La arquitectura funcional y técnica está aprobada.
2. La ubicación en monorepo (`apps/core-roadmap`) y el patrón de despliegue Vercel están confirmados.
3. Se aprueba avanzar a ROADMAP-001 (modelo de datos y esquema).

**Siguiente fase habilitada:** `ROADMAP-001-CORE-SCHEMA-AND-DATA-MODEL`
