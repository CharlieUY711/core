---
document_id: CN-CONST-0001
document_type: ArchitectureConstitution
title: "Biblioteca Arquitectónica Oficial de Core Nexus — Especificación Fundacional"
version: 1.0.0
status: Approved
owner: Enterprise Architecture Office (EAO)
authors:
  - Principal Enterprise Architect
  - Documentation Architect
  - Knowledge Governance Lead
reviewers:
  - Architecture Review Board (ARB)
approvers:
  - Chief Architect
audience: [Arquitectos, Desarrolladores, Agentes IA, Revisores, Auditores, Product Owners, Equipos de Integración]
classification: Internal / Normative
normative_level: MUST
depends_on: []
supersedes: []
superseded_by: null
related_documents: []
implementation_status: Specified
created: 2026-06-27
updated: 2026-06-27
tags: [arquitectura, documentación, gobernanza, knowledge-graph, ai-readiness]
keywords: [biblioteca arquitectónica, ADC, ADR, RFC, metadata, trazabilidad, RAG]
ai_index_metadata:
  embeddable: true
  chunk_strategy: section-aware
  authority_weight: 1.0
search_metadata:
  primary_domain: governance
  lifecycle_phase: foundational
knowledge_graph_metadata:
  node_type: ConstitutionNode
  provenance: EAO
  confidence: 1.0
---

# Biblioteca Arquitectónica Oficial de Core Nexus

> **Especificación Fundacional** — Este documento define la arquitectura documental que gobierna toda la evolución de la plataforma Core Nexus. Es la autoridad raíz de la cual derivan todos los SPEC, ADR, RFC, MIG y demás artefactos. No describe el producto; describe **cómo se documenta y gobierna** el producto.

---

## 0. Executive Summary

Core Nexus ha evolucionado de producto único a plataforma empresarial. Esta transición exige reemplazar el conocimiento implícito y disperso por una **arquitectura documental formal, trazable y gobernada**, capaz de sostener años de evolución, múltiples equipos y múltiples agentes de IA trabajando en paralelo.

La Biblioteca Arquitectónica de Core Nexus (en adelante, **la Biblioteca**) es un sistema documental con cuatro propiedades estructurales:

1. **Autoridad jerárquica explícita.** Cada documento declara su nivel normativo. Los conflictos se resuelven por jerarquía, no por discusión informal.
2. **Trazabilidad de extremo a extremo.** Toda decisión es rastreable desde su origen conceptual hasta el código, el despliegue y la observabilidad en producción.
3. **Doble legibilidad.** Cada documento es simultáneamente legible por humanos (prosa estructurada) y por máquinas (front-matter YAML, IDs estables, anclas citables, proyección a Knowledge Graph).
4. **Ciclo de vida gobernado.** Ningún documento "simplemente existe": nace, se revisa, se aprueba, se mantiene y se retira mediante estados y roles definidos.

Este documento entrega: la arquitectura documental, la taxonomía completa de tipos, el estándar de metadata, las estrategias de versionado y ciclo de vida, el modelo de gobernanza, la especificación del **Architecture Decision Catalog (ADC)**, el modelo de trazabilidad, el mapeo a Knowledge Graph, el modelo de AI Readiness, el modelo de búsqueda, la estructura de repositorio, la librería de plantillas, el modelo de calidad, el modelo de evolución, el plan de migración y un **Handoff Package** que permite a cualquier arquitecto o agente continuar la evolución sin pérdida de contexto.

La calidad objetivo es equivalente a estándares corporativos de arquitectura empresarial (TOGAF, ISO/IEC/IEEE 42010, Arc42, RFC 2119), adaptados a Core Nexus.

**Alcance de este entregable:** diseño del sistema documental únicamente. No incluye código, SQL, migraciones, herramientas ni supuestos sobre tecnologías concretas del producto.

---

## 1. Document Architecture

### 1.1 Objetivos

- Convertir la arquitectura en un activo **explícito, versionado y consultable**, no en conocimiento tribal.
- Garantizar que cualquier decisión pueda ser **encontrada, entendida y rastreada** años después de tomarse.
- Permitir que humanos y agentes de IA operen sobre la misma base de verdad sin ambigüedad de autoridad.
- Reducir el costo de incorporación (onboarding) de personas y agentes a una operación de **recuperación**, no de arqueología.

### 1.2 Principios rectores

La Biblioteca cumple, por construcción, los siguientes principios. Cada uno es verificable mediante el Document Quality Model (§14).

| Principio | Significado operativo |
|---|---|
| **Enterprise-grade** | Aplica niveles normativos, roles y aprobaciones formales. |
| **Versionable** | Todo documento tiene SemVer y lineage explícito. |
| **Escalable** | La taxonomía y el naming admiten crecimiento ilimitado sin colisión. |
| **Auditada** | Cada cambio deja rastro de autoría, revisión y aprobación. |
| **Trazable** | Existe una cadena ininterrumpida documento → operación. |
| **Consistente** | Plantillas y metadata obligatorias evitan divergencia estructural. |
| **Extensible** | Nuevos tipos documentales se añaden vía Meta-Model sin romper lo existente. |
| **Machine-readable** | Front-matter YAML + IDs + anclas estables. |
| **AI-friendly** | Chunking, embeddings, context/handoff packages nativos. |
| **Knowledge-first** | El documento es el origen; el código es una consecuencia. |
| **Human-friendly** | Prosa clara, plantillas predecibles, navegación por índices. |

### 1.3 Jerarquía de autoridad (pirámide normativa)

La autoridad es **estricta y descendente**. Un documento de tier inferior nunca puede contradecir uno de tier superior; si lo hace, está mal formado y debe corregirse o escalar una excepción (§6).

```
TIER 0 — CONSTITUTION
  └─ CN-CONST  Architecture Constitution (este documento y sus pares supremos)

TIER 1 — META & GOVERNANCE  (las reglas sobre las reglas)
  ├─ CN-META   Meta Model
  └─ CN-GOV    Governance Specification

TIER 2 — NORMATIVE SPECIFICATIONS  (el "qué debe ser")
  ├─ CN-SPEC   Normative Specification (genérica)
  ├─ CN-DOM    Domain Specification
  ├─ CN-SEC    Security Specification
  ├─ CN-DATA   Data Specification
  ├─ CN-API    API Specification
  ├─ CN-AI     AI Specification
  ├─ CN-INT    Integration Specification
  ├─ CN-TEST   Testing Specification
  ├─ CN-DEP    Deployment Specification
  ├─ CN-CFG    Configuration Specification
  ├─ CN-COMP   Compliance Specification
  └─ CN-KMODEL Knowledge Model
       └─ CN-ONTO Ontology / CN-GLOS Glossary (modelos semánticos de apoyo)

TIER 3 — DECISIONS  (el "por qué")
  ├─ CN-ADR    Architecture Decision Record
  ├─ CN-RFC    Request For Comments
  ├─ CN-ADC    Architecture Decision Catalog (índice/grafo de decisiones)
  └─ CN-MIG    Migration Specification

TIER 4 — GUIDANCE & OPERATION  (el "cómo")
  ├─ CN-IMPL   Implementation Guide
  ├─ CN-REF    Reference Documentation
  └─ CN-RUN    Operational Runbook

TIER 5 — RECORDS & EVIDENCE  (el "qué pasó")
  ├─ CN-ASSESS Architecture Assessment
  ├─ CN-REV    Architecture Review
  ├─ CN-INC    Incident Report
  ├─ CN-PM     Post Mortem
  ├─ CN-ROAD   Roadmap / Evolution Plan
  └─ CN-RES    Research Document
```

**Regla de precedencia:** Constitution > Meta/Governance > Normative Specs > Decisions > Guidance > Records. Las Decisions (Tier 3) pueden *originar cambios* en las Specs (Tier 2), pero solo a través del ciclo de gobernanza: una ADR aprobada genera una actualización versionada de la Spec correspondiente.

### 1.4 Responsabilidades por capa

| Tier | Responde a | Propietario típico | Frecuencia de cambio |
|---|---|---|---|
| 0 Constitution | "¿Bajo qué reglas existe todo?" | Chief Architect / EAO | Muy baja |
| 1 Meta & Governance | "¿Cómo se crean y gobiernan los documentos?" | EAO + Knowledge Governance | Baja |
| 2 Normative Specs | "¿Qué debe ser verdad en la plataforma?" | Domain/Capability Owners | Media |
| 3 Decisions | "¿Por qué decidimos así?" | Proponente + ARB | Alta (append-only) |
| 4 Guidance | "¿Cómo se hace en la práctica?" | Tech Leads | Alta |
| 5 Records | "¿Qué ocurrió / qué evaluamos?" | Equipos / Auditores | Continua (append-only) |

### 1.5 Ciclo de vida (resumen)

Todo documento atraviesa el ciclo definido en §5: `Draft → Proposed → In Review → Approved/Active → Deprecated → Superseded → Archived`, con `Rejected` como rama terminal de propuestas. Los documentos de tipo *Record* (ADR, Incident, Post Mortem) son **append-only**: no se editan tras su aprobación; se superseden con nuevas versiones.

### 1.6 Dependencias

Las relaciones entre documentos se declaran en metadata (`depends_on`, `supersedes`, `related_documents`) y se materializan como aristas en el Knowledge Graph (§9). Existen seis tipos de dependencia canónicos:

- **depends-on** — requiere a otro documento para ser válido.
- **refines** — especializa o detalla a otro.
- **supersedes / superseded-by** — reemplazo en el lineage.
- **constrains** — impone restricciones normativas sobre otro.
- **implements** — un documento de Tier 4 realiza lo definido en uno de Tier 2/3.
- **relates-to** — relación informativa sin obligación normativa.

---

## 2. Document Taxonomy

Cada tipo documental se define por siete atributos: **propósito, alcance, autoridad (nivel normativo), audiencia, momento de uso, dependencias y relaciones.** El prefijo de ID es la clave canónica de cada tipo.

> **Convención de lectura:** *Autoridad* usa RFC 2119 — `MUST` (vinculante), `SHOULD` (recomendado), `MAY` (informativo).

### Tier 0 — Foundational

**Architecture Constitution — `CN-CONST`**
- Propósito: establecer las reglas supremas e invariantes de la plataforma y de la propia Biblioteca.
- Alcance: toda la organización y todos los documentos.
- Autoridad: `MUST`. Máxima precedencia.
- Audiencia: todos.
- Momento de uso: al fundar la plataforma y en revisiones estratégicas.
- Dependencias: ninguna (es la raíz).
- Relaciones: *constrains* todo el resto.

### Tier 1 — Meta & Governance

**Meta Model — `CN-META`**
- Propósito: definir qué es un documento, qué tipos existen, qué metadata es obligatoria y cómo se relacionan. Es el esquema de la Biblioteca.
- Alcance: el sistema documental, no el producto.
- Autoridad: `MUST`.
- Audiencia: arquitectos, herramientas, agentes IA.
- Momento de uso: al crear o validar cualquier documento.
- Dependencias: `CN-CONST`.
- Relaciones: *constrains* la taxonomía y el metadata standard.

**Governance Specification — `CN-GOV`**
- Propósito: definir roles, permisos, aprobaciones, resolución de conflictos y excepciones.
- Alcance: ciclo de vida de todos los documentos.
- Autoridad: `MUST`.
- Audiencia: owners, revisores, aprobadores, auditores.
- Dependencias: `CN-CONST`, `CN-META`.

**Knowledge Model — `CN-KMODEL`**
- Propósito: modelar el conocimiento del dominio (conceptos, relaciones, reglas) de forma independiente de la implementación.
- Alcance: semántica de la plataforma.
- Autoridad: `SHOULD`/`MUST` según sección.
- Audiencia: arquitectos, modeladores, agentes IA.
- Dependencias: `CN-ONTO`, `CN-GLOS`.

### Tier 2 — Normative Specifications

**Normative Specification — `CN-SPEC`** (tipo genérico)
- Propósito: definir requisitos vinculantes sobre un aspecto de la plataforma cuando no aplica un tipo especializado.
- Autoridad: `MUST`.
- Audiencia: desarrolladores, integradores, IA.
- Dependencias: `CN-META`; típicamente derivada de una `CN-ADR` o `CN-RFC`.

**Domain Specification — `CN-DOM`** — define un dominio de negocio: entidades, invariantes, lenguaje ubicuo, límites de contexto. Autoridad `MUST`. Depende de `CN-KMODEL`, `CN-GLOS`.

**Security Specification — `CN-SEC`** — controles, amenazas, requisitos de seguridad. Autoridad `MUST`. Relaciona con `CN-COMP`, `CN-DATA`.

**Data Specification — `CN-DATA`** — modelos de datos, contratos, clasificación, retención, linaje de datos. Autoridad `MUST`.

**API Specification — `CN-API`** — contratos de interfaz, versionado de API, compatibilidad. Autoridad `MUST`. Depende de `CN-DOM`, `CN-DATA`.

**AI Specification — `CN-AI`** — capacidades, límites, guardrails, evaluación y gobernanza de componentes de IA. Autoridad `MUST`. Relaciona con `CN-SEC`, `CN-COMP`.

**Integration Specification — `CN-INT`** — contratos entre sistemas, protocolos, idempotencia, manejo de fallos. Autoridad `MUST`. Depende de `CN-API`.

**Testing Specification — `CN-TEST`** — estrategia, niveles, criterios de cobertura y aceptación. Autoridad `SHOULD`/`MUST`. Relaciona con cada Spec de Tier 2.

**Deployment Specification — `CN-DEP`** — topología, entornos, estrategia de release, rollback. Autoridad `MUST`. Relaciona con `CN-CFG`, `CN-RUN`.

**Configuration Specification — `CN-CFG`** — parámetros, feature flags, gestión de configuración por entorno. Autoridad `MUST`.

**Compliance Specification — `CN-COMP`** — requisitos regulatorios y de auditoría. Autoridad `MUST`.

**Glossary — `CN-GLOS`** — vocabulario controlado y términos canónicos. Autoridad `MUST` (define el lenguaje ubicuo).

**Ontology — `CN-ONTO`** — conceptos, clases, propiedades y relaciones formales que alimentan el Knowledge Graph. Autoridad `MUST`.

### Tier 3 — Decisions

**Architecture Decision Record — `CN-ADR`**
- Propósito: registrar una decisión arquitectónica concreta, su contexto, opciones y consecuencias.
- Autoridad: `MUST` una vez `Accepted`. **Append-only.**
- Audiencia: todos.
- Momento de uso: cuando una decisión es difícil de revertir o afecta a múltiples equipos.
- Dependencias: puede *refinar* o *superseder* otra ADR.
- Relaciones: alimenta el `CN-ADC`; puede originar una `CN-SPEC`.

**Request For Comments — `CN-RFC`**
- Propósito: proponer y deliberar un cambio antes de decidir.
- Autoridad: informativa hasta su resolución; al aprobarse genera una `CN-ADR`.
- Momento de uso: cambios significativos que requieren consenso.

**Architecture Decision Catalog — `CN-ADC`** — índice y grafo de todas las decisiones (especificado completo en §7). Autoridad `MUST` como registro de verdad.

**Migration Specification — `CN-MIG`**
- Propósito: especificar *qué* debe migrar y *bajo qué criterios* (sin escribir la migración).
- Autoridad: `MUST`. Depende de la decisión (`CN-ADR`) que la origina y de las Specs afectadas.

### Tier 4 — Guidance & Operation

**Implementation Guide — `CN-IMPL`** — cómo realizar lo definido en una Spec. Autoridad `SHOULD`. *implements* una `CN-SPEC`/`CN-DOM`.

**Reference Documentation — `CN-REF`** — material de consulta estable. Autoridad informativa.

**Operational Runbook — `CN-RUN`** — procedimientos operativos paso a paso. Autoridad `SHOULD`. Relaciona con `CN-DEP`, `CN-INC`.

### Tier 5 — Records & Evidence

**Architecture Assessment — `CN-ASSESS`** — evaluación del estado arquitectónico contra objetivos. Append-only.

**Architecture Review — `CN-REV`** — acta de revisión de un documento o iniciativa por el ARB. Append-only.

**Incident Report — `CN-INC`** — registro de un incidente. Append-only.

**Post Mortem — `CN-PM`** — análisis de causa raíz y acciones. Append-only. Relaciona con `CN-INC`; puede originar `CN-ADR`.

**Roadmap / Evolution Plan — `CN-ROAD`** — plan de evolución temporal. Versionable; refleja, no decide.

**Research Document — `CN-RES`** — exploración no vinculante. Autoridad informativa; puede alimentar `CN-RFC`.

### 2.1 Matriz de relaciones canónicas (resumen)

| Origen | Relación | Destino |
|---|---|---|
| CN-RFC | *resolves-into* | CN-ADR |
| CN-ADR | *originates* | CN-SPEC / CN-MIG |
| CN-ADR | *supersedes* | CN-ADR |
| CN-SPEC | *refines* | CN-DOM / CN-DATA / ... |
| CN-IMPL | *implements* | CN-SPEC |
| CN-PM | *originates* | CN-ADR |
| CN-MIG | *depends-on* | CN-SPEC + CN-ADR |
| Todos | *constrained-by* | CN-CONST / CN-GOV / CN-META |

---

## 3. Metadata Standard

Todo documento **MUST** comenzar con un bloque de front-matter YAML. Es la fuente machine-readable canónica; la prosa siguiente nunca puede contradecirlo. La validación contra este esquema es condición de entrada al estado `In Review` (§5).

### 3.1 Campos obligatorios y opcionales

| Campo | Tipo | Oblig. | Descripción / Restricción |
|---|---|---|---|
| `document_id` | string | ✔ | Patrón `CN-{TYPE}-{NNNN}`. Único e inmutable de por vida. |
| `document_type` | enum | ✔ | Uno de los tipos de §2. |
| `title` | string | ✔ | Título humano, ≤ 120 caracteres. |
| `version` | semver | ✔ | `MAJOR.MINOR.PATCH` (§4). |
| `status` | enum | ✔ | Estado del ciclo de vida (§5). |
| `owner` | string | ✔ | Rol o equipo responsable (no persona individual). |
| `authors` | list | ✔ | Autores. ≥ 1. |
| `reviewers` | list | ◑ | Obligatorio para entrar a `In Review`. |
| `approvers` | list | ◑ | Obligatorio para entrar a `Approved`. |
| `audience` | list[enum] | ✔ | Subconjunto de las audiencias definidas. |
| `classification` | enum | ✔ | `Public` / `Internal` / `Confidential` / `Restricted`. |
| `normative_level` | enum | ✔ | `MUST` / `SHOULD` / `MAY` / `INFORMATIVE`. |
| `depends_on` | list[id] | ◑ | IDs de los que depende su validez. |
| `supersedes` | list[id] | ◑ | Documentos que reemplaza. |
| `superseded_by` | id\|null | ✔ | `null` si vigente. |
| `related_documents` | list[id] | ◑ | Relaciones informativas. |
| `implementation_status` | enum | ✔ | `Specified` / `In Progress` / `Implemented` / `Verified` / `Retired`. |
| `created` | date | ✔ | ISO-8601. Inmutable. |
| `updated` | date | ✔ | ISO-8601. Cambia con cada versión. |
| `tags` | list | ◑ | Etiquetas libres de navegación. |
| `keywords` | list | ◑ | Términos para búsqueda textual. |
| `ai_index_metadata` | object | ✔ | `embeddable`, `chunk_strategy`, `authority_weight` (§10). |
| `search_metadata` | object | ✔ | `primary_domain`, `lifecycle_phase` (§11). |
| `knowledge_graph_metadata` | object | ✔ | `node_type`, `provenance`, `confidence` (§9). |

**Campos adicionales recomendados** (no en el prompt, añadidos por necesidad):

| Campo | Tipo | Propósito |
|---|---|---|
| `lineage_root` | id | Raíz del lineage; permite reconstruir toda la cadena de versiones. |
| `effective_date` | date | Fecha desde la cual la norma es exigible (puede diferir de la aprobación). |
| `review_due` | date | Fecha de re-revisión obligatoria; evita documentos "zombi". |
| `change_summary` | string | Resumen del cambio respecto de la versión anterior. |
| `risk_level` | enum | `Low`/`Medium`/`High`/`Critical`; alimenta búsqueda por riesgo (§11). |
| `traceability_anchors` | list | Anclas estables citables (§8, §10). |
| `language` | enum | Idioma principal (`es` por defecto). |
| `checksum` | string | Hash del contenido para detección de manipulación/auditoría. |

### 3.2 Reglas de integridad

- `document_id` es **inmutable**: una corrección de tipo o numeración crea un documento nuevo que *supersedes* al anterior.
- Si `status = Superseded`, entonces `superseded_by` **MUST** estar presente.
- `depends_on` no puede contener ciclos (validación de DAG al ingresar a `In Review`).
- Un documento no puede tener `normative_level` superior al de su tier (una `CN-REF` no puede ser `MUST`).
- `updated ≥ created`; cada bump de `version` actualiza `updated` y `change_summary`.

---

## 4. Versioning Strategy

### 4.1 SemVer documental

Se adopta SemVer con semántica adaptada a documentos:

- **MAJOR** — cambio **normativo o incompatible**: altera obligaciones, elimina o redefine secciones vinculantes, cambia contratos. Requiere re-aprobación completa y puede disparar migraciones (`CN-MIG`).
- **MINOR** — adición **compatible**: nueva sección, nuevo ejemplo normativo no contradictorio, clarificación que no cambia obligaciones existentes. Requiere revisión, no re-aprobación plena.
- **PATCH** — cambio **editorial**: typos, formato, enlaces, metadata no normativa. Aprobación ligera del owner.

`0.y.z` = pre-aprobación (Draft/Proposed). La primera versión aprobada es `1.0.0`.

### 4.2 Breaking changes

Un cambio es *breaking* si: invalida una implementación conforme previa, cambia un contrato de API/datos, o eleva/reduce el `normative_level`. Todo breaking change **MUST**:
1. incrementar MAJOR;
2. registrar una `CN-ADR` que lo justifique;
3. declarar `supersedes` sobre la versión anterior si la reemplaza por completo;
4. evaluar y, si aplica, emitir una `CN-MIG`.

### 4.3 Deprecación y archivado

- **Deprecation** — el documento sigue siendo verdad histórica pero **no debe usarse para nuevo trabajo**. `status = Deprecated`, se fija `review_due`, se añade aviso visible y, si existe, el reemplazo en `superseded_by`.
- **Archiving** — el documento deja de ser consultable como guía vigente; se mueve a `/archive` (§12) conservando su ID y lineage. Nunca se borra.

### 4.4 Lineage documental

El lineage se reconstruye siguiendo `supersedes`/`superseded_by` hasta `lineage_root`. Reglas:

- El lineage es un **árbol orientado** (un documento puede superseder a varios; un documento es supersedido por a lo sumo uno).
- El `document_id` se conserva entre versiones; la `version` distingue revisiones del mismo ID. El reemplazo por un ID distinto solo ocurre cuando cambia el tipo o el alcance fundamental.
- Toda la historia de versiones se proyecta al Knowledge Graph como `VersionHistory` (§9).

---

## 5. Document Lifecycle

### 5.1 Estados

`Draft` → `Proposed` → `In Review` → `Approved` (alias `Active`) → `Deprecated` → `Superseded` → `Archived`.
Rama terminal: `Rejected` (desde `In Review`).

### 5.2 Máquina de estados

```
            create
              │
            ┌─▼──┐  submit      ┌──────────┐  request review  ┌───────────┐
            │Draft├────────────►│ Proposed ├─────────────────►│ In Review │
            └──┬─┘              └────┬─────┘                  └─────┬─────┘
               │ withdraw            │ withdraw                     │
               ▼                     ▼                  ┌───────────┼───────────┐
            (deleted draft)      (deleted)        approve│       reject│   request changes
                                                         ▼             ▼            │
                                                   ┌──────────┐   ┌────────┐        │
                                                   │ Approved │   │Rejected│◄───────┘ (loop back to Draft)
                                                   │ (Active) │   └────────┘
                                                   └────┬─────┘
                                            deprecate    │   supersede
                                          ┌──────────────┴───────────────┐
                                          ▼                              ▼
                                    ┌───────────┐                 ┌────────────┐
                                    │Deprecated │───supersede────►│ Superseded │
                                    └─────┬─────┘                 └─────┬──────┘
                                          │ archive                     │ archive
                                          └──────────────┬──────────────┘
                                                         ▼
                                                   ┌──────────┐
                                                   │ Archived │
                                                   └──────────┘
```

### 5.3 Transiciones, roles y validaciones

| Transición | Rol autorizado | Validación de entrada |
|---|---|---|
| create → Draft | Author | front-matter mínimo presente. |
| Draft → Proposed | Author + Owner | metadata completa; `change_summary` presente. |
| Proposed → In Review | Owner | esquema de metadata válido; DAG sin ciclos; `reviewers` definidos. |
| In Review → Approved | Approver(s) per §6 | revisión registrada (`CN-REV`); checklist de plantilla superado; quality score ≥ umbral (§14). |
| In Review → Rejected | Approver(s) | motivo registrado. |
| In Review → Draft | Reviewer | "request changes" con observaciones. |
| Approved → Deprecated | Owner + ARB | aviso de deprecación; `review_due` fijado. |
| Approved/Deprecated → Superseded | Owner + ARB | `superseded_by` presente y `Approved`. |
| cualquiera → Archived | Knowledge Governance | lineage preservado; movido a `/archive`. |

**Invariante:** los tipos *Record* (ADR, INC, PM, ASSESS, REV) no admiten la transición `In Review → Draft` tras ser aprobados: se corrigen creando una nueva versión que *supersedes*.

---

## 6. Governance Model

### 6.1 Roles (RACI documental)

| Rol | Crea | Modifica | Aprueba | Deprecia | Archiva |
|---|:--:|:--:|:--:|:--:|:--:|
| Author | ✔ | ✔ (Draft) | – | – | – |
| Owner | ✔ | ✔ | – | propone | propone |
| Reviewer | – | comenta | – | – | – |
| Approver / ARB | – | – | ✔ | ✔ | – |
| Chief Architect | – | – | ✔ (Tier 0–1) | ✔ | – |
| Knowledge Governance | – | metadata | – | – | ✔ |
| Auditor | – | – | – | – | – (solo lee) |
| Agente IA | propone (Draft) | sugiere | – | – | – |

> Los **agentes IA** pueden generar borradores y proponer cambios, pero **nunca aprueban**. Toda transición a `Approved` requiere un aprobador humano con rol según el tier.

### 6.2 Autoridad de aprobación por tier

| Tier | Aprobador requerido |
|---|---|
| 0 Constitution | Chief Architect + quórum ARB |
| 1 Meta/Governance | Chief Architect |
| 2 Normative Specs | ARB + Domain Owner |
| 3 Decisions | ARB (ADR/RFC); Owner (MIG) |
| 4 Guidance | Tech Lead + Owner |
| 5 Records | Owner (registro de hecho) |

### 6.3 Resolución de conflictos y contradicciones

1. **Por jerarquía:** si dos documentos se contradicen, prevalece el de tier superior. El inferior está mal formado y debe corregirse.
2. **Mismo tier:** prevalece el de mayor `version`/fecha `effective_date`; si persiste, el ARB decide y registra una `CN-ADR` de desempate.
3. **Detección:** las contradicciones se detectan vía Knowledge Graph (aristas `conflicts-with`) y validaciones de búsqueda por dependencias (§11).

### 6.4 Excepciones

Una excepción a una norma `MUST` requiere una **Exception Record** (ADR especializada, `decision_kind: exception`) que declare: norma afectada, justificación, alcance, fecha de expiración y plan de remediación. Las excepciones son **temporales por defecto** (`review_due` obligatorio).

---

## 7. Architecture Decision Catalog (ADC)

### 7.1 Objetivo

El ADC es el **registro y grafo de verdad de todas las decisiones** de Core Nexus. No reemplaza a las ADR (que son los registros atómicos): el ADC es la capa de **índice, relación y consulta** sobre el conjunto de decisiones. Responde preguntas como "¿qué decisiones afectan al dominio X?", "¿qué se superseded?", "¿qué decisiones están en conflicto?".

### 7.2 Estructura y modelo

Cada **entrada del ADC** (una por decisión, ligada 1:1 a una `CN-ADR`) contiene:

| Campo | Descripción |
|---|---|
| `decision_id` | `CN-ADR-NNNN` (clave). |
| `title` | Enunciado de la decisión. |
| `decision_kind` | `architectural` / `technology` / `process` / `exception` / `reversal`. |
| `status` | `Proposed` / `Accepted` / `Deprecated` / `Superseded` / `Rejected`. |
| `domains` | Dominios afectados (IDs `CN-DOM`). |
| `entities` | Entidades afectadas. |
| `drivers` | Fuerzas/objetivos que motivan la decisión. |
| `consequences` | Positivas y negativas. |
| `relations` | Aristas tipadas a otras decisiones (§7.4). |
| `lineage` | `supersedes`/`superseded_by`. |
| `evidence` | Enlaces a RFC, RES, PM, ASSESS que la sustentan. |
| `impacts` | Specs/Code/Migrations afectados (cadena de trazabilidad, §8). |
| `risk_level` | Riesgo asociado a la decisión. |
| `history` | Cambios de estado con autor y fecha. |

### 7.3 Identificadores y numeración

- Decisiones: `CN-ADR-0001`, `CN-ADR-0002`, … numeración **monótona y sin reutilización**.
- El ADC en sí es `CN-ADC-0001` (documento único, versionable, regenerable desde las ADR).

### 7.4 Relaciones entre decisiones

Tipos de arista canónicos en el ADC: `supersedes`, `refines`, `depends-on`, `enables`, `constrains`, `conflicts-with`, `reverses`. Estas aristas son el insumo directo de los Decision Nodes del Knowledge Graph (§9).

### 7.5 Criterios de entrada / exclusión

- **Entra al ADC** toda decisión que: sea costosa de revertir, afecte a ≥ 2 equipos/dominios, fije un contrato, o introduzca/retire una capacidad. 
- **No entra:** preferencias locales reversibles, detalles de implementación sin impacto transversal (van a `CN-IMPL`), exploraciones (van a `CN-RES`).

### 7.6 Estado, versionado e historial

El ADC es **derivado y reconstruible**: su estado siempre puede regenerarse leyendo el front-matter de todas las ADR. Se versiona como documento (snapshot citable) y mantiene `history` por decisión.

### 7.7 Interacciones

- **Con los SPEC:** una decisión `Accepted` *origina* o modifica una `CN-SPEC`; el ADC enlaza ambos via `impacts`.
- **Con las ADR:** relación 1:1; la ADR es el registro narrativo, la entrada ADC es el índice estructurado.
- **Con el Knowledge Graph:** cada entrada ADC = un `DecisionNode` con sus aristas (§9).
- **Con la IA:** el ADC es la fuente preferente para que un agente recupere "el porqué" de cualquier parte del sistema (context package, §10).

---

## 8. Traceability Model

### 8.1 La cadena de trazabilidad

```
Documento  →  Decisión  →  Dominio  →  Entidad  →  Implementación
   →  Migración  →  Código  →  Testing  →  Deployment  →  Operación  →  Observabilidad
```

Cada eslabón se conecta al siguiente mediante **referencias estables** declaradas en metadata y materializadas como aristas en el Knowledge Graph.

### 8.2 Mecanismo de enlace

- Cada artefacto interno (entidad, contrato, runbook, etc.) tiene un **anchor estable** (`traceability_anchors`) con la forma `CN-{TYPE}-{NNNN}#anchor`.
- Los eslabones que viven fuera de la Biblioteca (código, pipelines, dashboards) se enlazan por **referencia inversa**: el artefacto externo cita el ID del documento que lo gobierna (p. ej. un commit/PR referencia `CN-ADR-0042`; un test referencia `CN-TEST-0003#caso-7`).
- La trazabilidad es **bidireccional**: "qué documento gobierna este código" y "qué código realiza esta decisión".

### 8.3 Modelo de un enlace de trazabilidad

| Campo | Descripción |
|---|---|
| `from` | ID + anchor origen. |
| `to` | ID/URI destino (puede ser externo). |
| `link_type` | `decides` / `defines` / `implements` / `migrates` / `tests` / `deploys` / `operates` / `observes`. |
| `confidence` | Grado de certeza del enlace (humano = 1.0; inferido por IA < 1.0). |
| `provenance` | Quién/qué estableció el enlace. |
| `verified_at` | Última verificación. |

### 8.4 Mantenimiento durante la vida del sistema

- **Entrada obligatoria:** ninguna `CN-SPEC` se aprueba sin enlazar a su `CN-ADR` de origen; ninguna `CN-MIG` sin enlazar a la Spec y decisión que la motivan.
- **Verificación periódica:** `review_due` dispara re-verificación de enlaces; enlaces con `verified_at` vencido se marcan como *stale*.
- **Detección de huérfanos:** el modelo de búsqueda (§11) reporta documentos sin enlaces entrantes/salientes esperados y código que referencia IDs inexistentes o archivados.
- **Impact analysis:** ante un cambio en cualquier eslabón, el grafo permite calcular aguas abajo todos los artefactos afectados (§9).

---

## 9. Knowledge Graph Mapping

La Biblioteca se proyecta a un Knowledge Graph (KG) que es la **vista navegable y consultable** del corpus documental. El KG es derivado: siempre reconstruible desde el front-matter y los enlaces de trazabilidad.

### 9.1 Tipos de nodo

| Nodo | Origen | Propiedades clave |
|---|---|---|
| `DocumentNode` | cada documento | id, type, version, status, normative_level, authority_weight |
| `DecisionNode` | cada entrada ADC / ADR | decision_kind, status, risk_level |
| `DomainNode` | `CN-DOM` | nombre, bounded context |
| `EntityNode` | entidades en Domain/Data Specs | nombre, invariantes |
| `MigrationNode` | `CN-MIG` | alcance, estado |
| `ADRNode` | `CN-ADR` | (especialización de DecisionNode) |
| `ExternalArtifactNode` | código/test/deploy/observabilidad | URI, sistema, referencia inversa |

### 9.2 Tipos de relación (aristas)

`supersedes`, `refines`, `depends-on`, `constrains`, `implements`, `decides`, `defines`, `affects`, `conflicts-with`, `enables`, `reverses`, `relates-to`, `tests`, `deploys`, `operates`, `observes`.

### 9.3 Propiedades semánticas de cada arista

- **Semantic link** — el tipo tipado de la relación (arriba).
- **Confidence** — `[0,1]`. Enlaces declarados por humanos = 1.0; inferidos por IA conservan su score.
- **Provenance** — autor/herramienta/decisión que originó la arista.
- **Lineage** — para aristas de versión, referencia a `lineage_root`.
- **Version History** — secuencia de versiones de un nodo documental.
- **Impact Analysis** — el KG soporta consultas de alcance transitivo: dado un nodo, devolver el cierre aguas abajo por aristas `affects`/`implements`/`depends-on` para estimar el blast radius de un cambio.

### 9.4 Reglas de proyección

1. Crear/actualizar un documento ⇒ upsert de su `DocumentNode` y de sus aristas de metadata.
2. Aprobar una ADR ⇒ upsert de su `DecisionNode` y aristas del ADC.
3. Archivar ⇒ el nodo se conserva con `status: Archived` (nunca se borra; el KG es memoria histórica).
4. El KG **no** es fuente de verdad normativa; ante discrepancia, mandan los documentos.

---

## 10. AI Readiness

La Biblioteca es nativamente operable por agentes IA. El diseño anterior (IDs estables, front-matter, anclas, KG) es el sustrato; esta sección define el contrato de consumo por IA.

### 10.1 Recuperación de contexto (context retrieval)

Un agente recupera contexto en tres pasos: (1) localizar documentos relevantes vía búsqueda híbrida (§11); (2) ordenar por `authority_weight` (tier) y `status` (vigente > deprecado); (3) ensamblar un **context package** respetando la jerarquía normativa.

### 10.2 Chunking

- Estrategia por defecto: **section-aware** — los chunks respetan límites de sección (`##`/`###`), nunca parten una obligación normativa a la mitad.
- Cada chunk hereda: `document_id`, `version`, `status`, `normative_level`, `section_anchor`. Esto preserva la **citabilidad** y la autoridad a nivel de fragmento.
- `chunk_strategy` se declara por documento en `ai_index_metadata`.

### 10.3 Embeddings

- Se indexa por chunk. El metadata de autoridad se almacena junto al vector para permitir *re-ranking por autoridad* (un chunk `MUST` de Tier 2 pesa más que uno informativo).
- Reindexado obligatorio ante MAJOR/MINOR; PATCH puede diferirse.

### 10.4 Citabilidad y referencias

- Toda afirmación recuperada es citable como `CN-{TYPE}-{NNNN}@{version}#{anchor}`.
- Un agente **MUST** citar la fuente y su versión al usar contenido normativo, y **MUST** preferir documentos `Approved` no `Deprecated`.

### 10.5 Context / Handoff / Prompt packages

| Paquete | Contenido | Uso |
|---|---|---|
| **Context Package** | conjunto mínimo de chunks + metadata de autoridad necesarios para una tarea. | RAG en tiempo de respuesta. |
| **Handoff Package** | estado, decisiones vigentes, open issues, enlaces de trazabilidad y "próximos pasos" de un área. | Traspaso entre agentes/personas sin pérdida de contexto (§ final). |
| **Prompt Package** | instrucciones + restricciones derivadas de las Specs aplicables, ya resueltas por jerarquía. | Inicializar un agente para trabajar conforme a la norma. |

### 10.6 RAG y reconstrucción de contexto

- **Machine readability:** front-matter YAML + cuerpo Markdown estructurado garantizan parsing determinista.
- **Semantic search:** vía embeddings por chunk (§11).
- **Context reconstruction:** dado cualquier ID, un agente puede reconstruir su contexto completo siguiendo `depends_on`, `supersedes` y el KG, sin intervención humana.

---

## 11. Search Model

Búsqueda **híbrida**: textual (léxica) + semántica (embeddings) + estructurada (sobre metadata y KG).

| Eje de búsqueda | Mecanismo | Campos/Fuente |
|---|---|---|
| **Textual** | índice léxico | `title`, `keywords`, cuerpo |
| **Semántica** | embeddings por chunk | vectores + autoridad |
| **Por decisiones** | consulta al ADC | `decision_kind`, `status`, `domains` |
| **Por dominios** | filtro KG | `DomainNode` y aristas `affects` |
| **Por entidades** | filtro KG | `EntityNode` |
| **Por dependencias** | recorrido de grafo | aristas `depends-on` |
| **Por relaciones** | recorrido de grafo | cualquier arista tipada |
| **Por versiones** | filtro metadata | `version`, `lineage_root` |
| **Por estado** | filtro metadata | `status`, `implementation_status` |
| **Por impacto** | impact analysis (§9.3) | cierre transitivo |
| **Por riesgo** | filtro metadata | `risk_level` |

**Re-ranking:** los resultados se reordenan por `authority_weight` × vigencia (`status`) × relevancia. Los documentos `Deprecated`/`Archived` aparecen marcados y por defecto al final.

---

## 12. Repository Structure

Estructura física propuesta (agnóstica de tecnología; cualquier VCS sirve):

```
/core-nexus-architecture-library
├── /00-constitution            # CN-CONST (Tier 0)
├── /01-meta-governance         # CN-META, CN-GOV
├── /02-specifications
│   ├── /domain                 # CN-DOM
│   ├── /security               # CN-SEC
│   ├── /data                   # CN-DATA
│   ├── /api                    # CN-API
│   ├── /ai                     # CN-AI
│   ├── /integration            # CN-INT
│   ├── /testing                # CN-TEST
│   ├── /deployment             # CN-DEP
│   ├── /configuration          # CN-CFG
│   ├── /compliance             # CN-COMP
│   └── /knowledge-model        # CN-KMODEL, CN-ONTO, CN-GLOS
├── /03-decisions
│   ├── /adr                    # CN-ADR-NNNN.md (uno por archivo)
│   ├── /rfc                    # CN-RFC-NNNN.md
│   ├── /adc                    # CN-ADC-0001 (catálogo) + índice generado
│   └── /migrations             # CN-MIG-NNNN.md
├── /04-guidance
│   ├── /implementation         # CN-IMPL
│   ├── /reference              # CN-REF
│   └── /runbooks               # CN-RUN
├── /05-records
│   ├── /assessments            # CN-ASSESS
│   ├── /reviews                # CN-REV
│   ├── /incidents              # CN-INC
│   ├── /post-mortems           # CN-PM
│   ├── /roadmaps               # CN-ROAD
│   └── /research               # CN-RES
├── /_templates                 # Template Library (§13)
├── /_indexes                   # índices y catálogos generados (read-only)
│   ├── catalog.json            # índice maestro de todos los documentos
│   ├── adc-index.json          # índice de decisiones
│   ├── traceability.json       # grafo de trazabilidad
│   └── knowledge-graph.json    # proyección KG
├── /_assets                    # imágenes, diagramas fuente
├── /_diagrams                  # diagramas (fuente + render)
├── /_annexes                   # anexos
└── /archive                    # documentos Archived (lineage preservado)
```

### 12.1 Convenciones de naming

- Archivo: `{document_id}-{slug-del-titulo}.md` → `CN-ADR-0042-event-sourcing-en-pagos.md`.
- Una entidad documental = un archivo. Las versiones viven en el historial del VCS; los snapshots citables se etiquetan (tags) por versión.
- Carpetas y slugs en `kebab-case`, sin acentos ni espacios.

### 12.2 Índices y catálogos

`/_indexes` es **generado y read-only**: se reconstruye a partir del front-matter de todos los documentos. Nunca se edita a mano. Es la fuente que alimentan búsqueda, ADC y KG.

---

## 13. Template Library

Cada tipo documental tiene una plantilla oficial en `/_templates`. Toda plantilla declara: **estructura**, secciones obligatorias/opcionales, metadata requerida, **checklist de aceptación** y **handoff package**.

### 13.1 Plantilla base (común a todos los tipos)

```
---
[front-matter completo según §3]
---
# {Título}
## Contexto / Propósito          (obligatoria)
## Alcance                       (obligatoria)
## Contenido normativo / cuerpo  (obligatoria — varía por tipo)
## Dependencias y relaciones     (obligatoria)
## Trazabilidad                  (obligatoria — enlaces §8)
## Open Issues                   (opcional)
## Handoff Package               (obligatoria)
## Anexos                        (opcional)
```

### 13.2 Plantilla ADR (`CN-ADR`)

Secciones obligatorias: **Contexto** · **Decisión** · **Drivers** · **Opciones consideradas** · **Consecuencias (positivas/negativas)** · **Estado** · **Relaciones (supersedes/refines/conflicts)** · **Trazabilidad** · **Handoff**.
Checklist de aceptación: decisión enunciada en una frase; ≥ 2 opciones evaluadas; consecuencias negativas explícitas; enlace a la Spec que origina; entrada ADC creada.

### 13.3 Plantilla SPEC normativa (`CN-SPEC`/`CN-DOM`/…)

Secciones obligatorias: **Objetivo** · **Requisitos normativos (MUST/SHOULD/MAY enumerados y referenciables)** · **Modelo/entidades** · **Restricciones** · **Criterios de verificación** · **Dependencias** · **Trazabilidad** · **Handoff**.
Checklist: cada requisito tiene ID y nivel normativo; cada requisito es verificable; enlace a la ADR de origen.

### 13.4 Plantilla RFC (`CN-RFC`)

Secciones: **Resumen** · **Motivación** · **Propuesta** · **Alternativas** · **Impacto** · **Preguntas abiertas** · **Plan de resolución** · **Handoff**.

### 13.5 Plantilla Migration Spec (`CN-MIG`)

Secciones: **Qué migra** · **Criterios** · **Riesgos** · **Prioridad y orden** · **Reversibilidad** · **Decisión de origen** · **Specs afectadas** · **Handoff**. (Sin código ni SQL.)

### 13.6 Plantilla Incident / Post Mortem (`CN-INC`/`CN-PM`)

Secciones: **Resumen** · **Línea de tiempo** · **Impacto** · **Causa raíz** · **Acciones correctivas** · **Decisiones originadas (ADR)** · **Handoff**. Append-only.

> Las plantillas restantes (REF, RUN, SEC, DATA, API, AI, INT, TEST, DEP, CFG, COMP, ASSESS, REV, ROAD, RES, ONTO, GLOS, KMODEL, META, GOV, CONST) heredan la base §13.1 y especializan su sección de "cuerpo normativo" según su propósito en §2.

---

## 14. Document Quality Model

Cada documento recibe un **quality score** evaluado en su entrada a `In Review`. El umbral mínimo de aprobación lo fija `CN-GOV` por tier (sugerido: ≥ 0.8 para Tier 0–2).

| Dimensión | Qué mide | Señal de evaluación |
|---|---|---|
| **Completitud** | secciones obligatorias presentes | checklist de plantilla |
| **Consistencia** | sin contradicciones internas ni con tiers superiores | validación KG `conflicts-with` |
| **Cobertura** | el alcance declarado está efectivamente cubierto | revisión humana + gaps |
| **Trazabilidad** | enlaces requeridos presentes y verificados | §8 |
| **Legibilidad** | claridad, estructura, lenguaje ubicuo | revisión + métricas de legibilidad |
| **Ambigüedad** | ausencia de términos vagos en cláusulas normativas | lint de lenguaje normativo |
| **Normatividad** | uso correcto de MUST/SHOULD/MAY | lint RFC 2119 |
| **Mantenibilidad** | facilidad de actualización; `review_due` fijado | metadata |
| **Reutilización** | referenciable y citable por anclas | `traceability_anchors` |
| **AI Readiness** | chunking, embeddings, citabilidad correctos | `ai_index_metadata` válido |

El score es la media ponderada de las dimensiones (pesos definidos en `CN-GOV`). Un score bajo bloquea la aprobación y genera observaciones.

---

## 15. Evolution Model

### 15.1 Incorporación de nuevos documentos

Nuevo documento ⇒ instanciar la plantilla del tipo ⇒ asignar `document_id` desde el contador del tipo ⇒ recorrer el ciclo de vida (§5). Los índices y el KG se regeneran automáticamente.

### 15.2 Nuevos *tipos* documentales

Añadir un tipo requiere modificar el **Meta Model** (`CN-META`) vía RFC + ADR aprobadas: se define prefijo de ID, tier, plantilla, metadata y relaciones. Esto garantiza extensibilidad sin romper lo existente (los tipos previos no se ven afectados).

### 15.3 Reemplazo, versionado y compatibilidad

- Reemplazo: nueva versión que *supersedes*; el anterior pasa a `Deprecated`/`Superseded` pero nunca se borra.
- Compatibilidad: los breaking changes (§4.2) obligan a ADR + evaluación de migración; los cambios MINOR/PATCH preservan compatibilidad por definición.

### 15.4 Gobierno del crecimiento

- **Anti-zombi:** `review_due` obligatorio; documentos sin revisar a tiempo se marcan *stale* y entran a cola de revisión.
- **Anti-duplicación:** antes de crear, búsqueda obligatoria (§11) para detectar solapamientos.
- **Métricas de salud:** cobertura por dominio, ratio de documentos vigentes vs. deprecados, enlaces stale, decisiones huérfanas. Se reportan periódicamente al ARB.

---

## 16. Migration Plan

Migración de la documentación existente hacia la Biblioteca, en cinco fases. **No incluye implementación de herramientas ni scripts.**

### 16.1 Fase 1 — Inventario
Catalogar todo documento actual: ubicación, autor, fecha, propósito aparente, formato. Resultado: inventario crudo.

### 16.2 Fase 2 — Clasificación
Mapear cada documento al tipo más cercano de la taxonomía (§2). Marcar: *adoptable* (encaja), *fragmentable* (contiene varios tipos), *obsoleto* (archivar), *huérfano* (sin tipo claro → revisión).

### 16.3 Fase 3 — Normalización
Aplicar plantilla y front-matter; asignar `document_id`; reconstruir enlaces de trazabilidad conocidos; extraer decisiones implícitas como ADR retroactivas (`status: Accepted`, con nota de origen histórico).

### 16.4 Fase 4 — Riesgos y prioridades
Riesgos: pérdida de contexto histórico, decisiones implícitas no documentadas, contradicciones latentes, autoría desconocida.
Prioridad (mayor a menor): documentos que gobiernan código en producción → contratos de API/datos → decisiones transversales → guías → material de referencia.

### 16.5 Fase 5 — Orden recomendado
1. Constitution + Meta + Governance (fundar el marco).
2. Glossary + Ontology + Knowledge Model (fijar el lenguaje).
3. Domain Specs de los dominios críticos.
4. ADR retroactivas de las decisiones aún vigentes.
5. Specs técnicas (Security, Data, API, AI, Integration…).
6. Guidance y Records.
7. Archivado de lo obsoleto.

> Criterio de éxito de la migración: todo documento productivo tiene tipo, metadata válida, owner y al menos un enlace de trazabilidad; cero contradicciones con Tier 0–1.

---

## 17. Deliverables — Cierre

Las secciones anteriores entregan: Executive Summary (§0), Architecture Overview (§1), Document Taxonomy (§2), Metadata Standard (§3), Governance Model (§6), ADC Specification (§7), Knowledge Graph Mapping (§9), AI Readiness Model (§10), Repository Structure (§12), Template Library (§13) y Migration Strategy (§16). Se completan a continuación los entregables restantes.

### 17.1 Roadmap (de adopción de la Biblioteca)

| Horizonte | Objetivo | Hitos |
|---|---|---|
| **H1 — Fundación** | Marco operativo | Aprobar CN-CONST, CN-META, CN-GOV; publicar plantillas; activar índices. |
| **H2 — Lenguaje** | Semántica común | Glossary, Ontology, Knowledge Model; primeras Domain Specs. |
| **H3 — Decisiones** | Memoria del porqué | ADC operativo; ADR retroactivas; trazabilidad mínima viable. |
| **H4 — Cobertura técnica** | Specs completas | Security, Data, API, AI, Integration, Testing, Deployment. |
| **H5 — Operación IA** | Consumo por agentes | Embeddings, context/handoff packages, búsqueda híbrida. |
| **H6 — Sostenibilidad** | Salud continua | Métricas de calidad, anti-zombi, revisiones periódicas del ARB. |

### 17.2 Open Issues

1. Definir los **pesos exactos** del quality score por tier (pendiente en `CN-GOV`).
2. Definir umbrales de `confidence` para aceptar enlaces de trazabilidad **inferidos por IA** sin revisión humana.
3. Política de **retención** de versiones archivadas (cuánto historial conservar activo en el KG).
4. Mecanismo concreto de **referencia inversa** desde código/pipelines (convención de citación de IDs) — a especificar sin atar tecnología.
5. Estrategia de **internacionalización** documental si se requieren idiomas más allá de `es`.

### 17.3 Architectural Decisions (de esta Biblioteca)

Decisiones tomadas en este diseño, candidatas a formalizarse como las primeras ADR del sistema:

- **AD-1:** jerarquía de autoridad estricta por tiers, con resolución de conflictos por precedencia.
- **AD-2:** front-matter YAML como fuente machine-readable canónica, superior a la prosa.
- **AD-3:** SemVer documental con MAJOR = cambio normativo/breaking.
- **AD-4:** ADC como capa de índice/grafo sobre ADR atómicas (no las reemplaza).
- **AD-5:** Records (ADR/INC/PM) append-only; corrección por supersesión, nunca por edición.
- **AD-6:** índices, ADC y KG son **derivados y regenerables**, nunca fuente de verdad normativa.
- **AD-7:** los agentes IA proponen pero **nunca aprueban**.

### 17.4 Recommendations

1. Aprobar primero Tier 0–1; sin marco, todo lo demás deriva sin autoridad.
2. Fijar el lenguaje (Glossary/Ontology) antes que las Specs de dominio, para evitar divergencia terminológica costosa de corregir.
3. Tratar la generación de índices/KG como proceso **automático y read-only** desde el día uno; editar a mano garantiza desincronización.
4. Hacer obligatorio el `review_due` para evitar acumulación de documentos zombi.
5. Exigir enlace de trazabilidad como **condición de aprobación**, no como tarea posterior.

### 17.5 Risk Assessment

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Adopción parcial (se crea pero no se usa) | Alta | Alto | Integrar la cita de IDs en el flujo de trabajo; métricas de uso. |
| Documentos zombi / desactualizados | Alta | Medio | `review_due` + cola de revisión + reporte de salud. |
| Burocracia excesiva frena la entrega | Media | Alto | Aprobación ligera para Tier 4–5; plantillas mínimas; IA asiste el llenado. |
| Desincronización índices/KG vs. documentos | Media | Alto | Generación automática read-only; documentos como única verdad. |
| Decisiones implícitas nunca documentadas | Alta | Alto | ADR retroactivas en la migración; lint de "código sin documento". |
| Sobre-clasificación / fricción en taxonomía | Media | Medio | Tipo genérico `CN-SPEC` como escape; revisión de taxonomía vía Meta-Model. |
| Enlaces de trazabilidad inferidos por IA erróneos | Media | Medio | Umbral de `confidence`; verificación humana de enlaces normativos. |

### 17.6 Future Evolution

- **Validación continua** del corpus contra el Meta Model (consistencia automatizada).
- **Asistentes de autoría** que pre-rellenan plantillas y proponen enlaces de trazabilidad con `confidence`.
- **Impact analysis interactivo** sobre el KG antes de aprobar cambios.
- **Métricas de "deuda documental"** análogas a la deuda técnica.
- **Federación** del modelo a otras plataformas de la organización reutilizando Meta/Governance.

---

# HANDOFF PACKAGE

> Este paquete permite a cualquier arquitecto o agente continuar la evolución de la Biblioteca **sin pérdida de contexto**.

### A. Estado actual
- Documento: `CN-CONST-0001`, versión `1.0.0`, estado `Approved` (especificación fundacional de la Biblioteca).
- Alcance entregado: diseño completo del sistema documental (§1–§17). **No** se ha implementado nada (sin código, SQL, migraciones ni herramientas, por restricción explícita).

### B. Decisiones vigentes
Las siete decisiones de §17.3 (AD-1…AD-7) son la base normativa de la Biblioteca y deben formalizarse como las primeras ADR (`CN-ADR-0001`…`CN-ADR-0007`).

### C. Invariantes que NO deben romperse
1. La jerarquía de autoridad por tiers (§1.3) y su precedencia.
2. `document_id` inmutable; corrección por supersesión, no por reescritura.
3. Front-matter YAML como verdad machine-readable canónica.
4. Índices, ADC y KG son derivados y regenerables, nunca fuente normativa.
5. La IA propone, el humano aprueba.
6. Trazabilidad como condición de aprobación.

### D. Próximos pasos recomendados (en orden)
1. Crear `CN-META-0001` (Meta Model) y `CN-GOV-0001` (Governance) ratificando §3, §5, §6, §14.
2. Formalizar AD-1…AD-7 como ADR.
3. Crear las plantillas físicas en `/_templates` (§13).
4. Levantar `catalog.json` / `adc-index.json` / `traceability.json` / `knowledge-graph.json` como artefactos generados (§12.2).
5. Ejecutar la Fase 1 del plan de migración (inventario, §16.1).

### E. Open Issues abiertos
Ver §17.2 (pesos de calidad, umbrales de confianza IA, retención, referencia inversa, i18n). Ninguno bloquea el arranque de H1.

### F. Contexto para agentes IA
- Punto de entrada: este documento (`authority_weight = 1.0`).
- Para "qué debe ser": Tier 2 (Specs). Para "por qué": ADC + ADR. Para "cómo": Tier 4.
- Citar siempre `CN-{TYPE}-{NNNN}@{version}#{anchor}`; preferir `Approved` sobre `Deprecated`.
- Reconstrucción de contexto: seguir `depends_on` y `supersedes` + KG desde cualquier ID.

### G. Glosario mínimo de este documento
- **ADC** — Architecture Decision Catalog: índice/grafo de decisiones.
- **ADR** — Architecture Decision Record: registro atómico de una decisión.
- **Tier** — nivel de autoridad documental (0 = máximo).
- **Lineage** — cadena de versiones/supersesiones de un documento.
- **Context/Handoff/Prompt Package** — paquetes de consumo para IA (§10.5).
- **Stale** — enlace o documento cuya verificación/revisión ha vencido.

---

*Fin de la especificación. Este documento es la autoridad raíz (`CN-CONST-0001`) de la Biblioteca Arquitectónica de Core Nexus.*
