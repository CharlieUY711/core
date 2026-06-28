---
document_id: CN-ADC-UPDATE-001B
document_type: ArchitectureDecisionCatalogUpdate
title: "SPEC-001B → ADC — Extracción de Decisiones del Knowledge Model (BEP Real Slice)"
version: 1.0.0
status: Draft
flow_step: "2 — 001B → ADC"
source_spec: SPEC-001B
source_spec_map: CN-KMODEL-0001
source_of_truth: "BEP-master.md §4"
constrained_by: [SPEC-000, CN-CONST-0001@1.0.0]
owner: Enterprise Architecture Office (EAO)
authors: [Documentation Architect]
classification: Internal / Normative
normative_level: MUST
implementation_status: Specified
created: 2026-06-27
updated: 2026-06-27
tags: [ADC, ADR, knowledge-model, BEP, trazabilidad]
knowledge_graph_metadata:
  node_type: CatalogUpdate
  provenance: EAO
  confidence: 1.0
---

# SPEC-001B → ADC

> **Paso 2 del flujo.** Este paquete formaliza como entradas de ADC las decisiones arquitectónicas que SPEC-001B (Knowledge Model, BEP real slice) ya contiene de forma implícita. No define arquitectura futura ni Meta Model (eso es 001C). No incluye código, SQL ni migraciones, en cumplimiento de SPEC-000 y de la restricción `Implementation: FORBIDDEN` de 001B.

## 0. Reglas aplicadas

- **Marco:** todas las decisiones son `constrained-by` SPEC-000 (`CN-CONST-0001@1.0.0`, Frozen Baseline).
- **Estado:** las decisiones nacen **`Proposed`** porque su fuente (SPEC-001B) está en `Draft`. Se promueven a **`Accepted`** automáticamente cuando 001B pase a `Approved` (regla de gobernanza §5/§6 de SPEC-000).
- **Evidencia / source of truth:** cada ADR enlaza a `SPEC-001B (CN-KMODEL-0001)` y a `BEP-master.md §4`. Nada se cataloga si no está verificado en el esquema real.
- **Criterio de entrada al ADC (SPEC-000 §7.5):** solo entran decisiones costosas de revertir, que afectan ≥ 2 entidades/dominios o que fijan un contrato. La *technical debt* y los *open issues* de 001B **no** son ADR (se registran aparte, §4).
- **Numeración:** asumo que `SPEC-001A → ADC` ocupó `CN-ADR-0001…0007`. Estas entradas continúan desde **`CN-ADR-0008`**. Si 001A cerró en otro número, corré el offset; el resto del paquete es estable.

---

## 1. Decisiones extraídas (ADR)

Cada bloque sigue la plantilla ADR de SPEC-000 §13.2.

### CN-ADR-0008 — Re-anclar el Knowledge Model de BEP al esquema real verificado
- **decision_kind:** `reversal`
- **status:** Proposed
- **Contexto:** El modelo previo (KModel v1.0.0) se apoyaba en entidades ideales no verificadas (Proposal, Bid, Approval). El dominio real operativo de BEP no las contiene.
- **Decisión:** El Knowledge Model se reancla **exclusivamente** al esquema real existente en `BEP-master.md §4`. Se eliminan Proposal, Bid y Approval como entidades del modelo.
- **Drivers:** corregir la fuente de verdad; eliminar deuda conceptual; alinear conocimiento con la base de datos real.
- **Opciones consideradas:** (a) mantener el modelo ideal y reconciliar luego — rechazada por divergencia creciente; (b) modelo híbrido ideal/real — rechazada por ambigüedad de autoridad; (c) **reanclaje total al esquema real** — elegida.
- **Consecuencias (+):** trazabilidad fiel; base sólida para 001C. **(−):** se pierde el vocabulario de "propuesta/oferta/aprobación" hasta que existan como entidades reales; cualquier flujo que los asumía debe re-derivarse.
- **Relaciones:** `reverses` la decisión de modelado de KModel v1.0.0; `enables` CN-ADR-0012.
- **Trazabilidad:** evidence → SPEC-001B CHANGE NOTE + §3; impacts → todo el catálogo de entidades.
- **Handoff:** prohibición explícita de reintroducir entidades futuras sin RFC/ADR propia.

### CN-ADR-0009 — Compliance Item como hub central de trazabilidad
- **decision_kind:** `architectural`
- **status:** Proposed
- **Contexto:** La trazabilidad del dominio (requisito ↔ documento ↔ BOM ↔ fabricante ↔ evidencia) necesita un punto de convergencia único.
- **Decisión:** `compliance_matrix` (Compliance Item) es el **hub central**: concentra las FK hacia `requirement_id`, `document_id`, `bom_line_id`, `manufacturer_id` y porta `evidence`/`status`.
- **Drivers:** trazabilidad de extremo a extremo; consultas de cumplimiento; un solo lugar de verdad para el estado de conformidad.
- **Opciones consideradas:** (a) trazabilidad distribuida en cada entidad — rechazada por dispersión; (b) **hub único** — elegida.
- **Consecuencias (+):** consultas de cumplimiento y cadenas de trazabilidad simples; mapeo natural a "hub node" en el KG. **(−):** punto de acoplamiento; riesgo de sobrecarga del hub (ver deuda §4: *compliance-status coupling*).
- **Relaciones:** `constrains` CN-ADR-0011; `relates-to` CN-ADR-0010.
- **Trazabilidad:** evidence → SPEC-001B §3.6, §"Relationship Model", §"Knowledge Graph Foundation".

### CN-ADR-0010 — Modelo de datos estrictamente relacional (FK-first, sin EAV ni schema dinámico)
- **decision_kind:** `architectural`
- **status:** Proposed
- **Contexto:** El dominio exige integridad referencial fuerte y consultas predecibles.
- **Decisión:** Modelo **relational-first** con **FK estructurales estrictas**; **prohibido EAV**; **prohibido schema dinámico**; **JSONB solo para extensiones controladas** (`ai_quantities`, `linked_entities`).
- **Drivers:** integridad, predictibilidad de consultas, evitar deuda de modelado flexible.
- **Opciones consideradas:** (a) EAV/atributos dinámicos — rechazada; (b) **relacional estricto con JSONB acotado** — elegida.
- **Consecuencias (+):** integridad garantizada; base limpia para invariantes del Meta Model. **(−):** menos flexibilidad ad hoc; cada extensión requiere decisión.
- **Relaciones:** `constrains` CN-ADR-0011, CN-ADR-0014; `relates-to` CN-ADR-0009.
- **Trazabilidad:** evidence → SPEC-001B §"Data Model Constraints".

### CN-ADR-0011 — Polimorfismo confinado a `Decision.linked_entities`
- **decision_kind:** `architectural`
- **status:** Proposed
- **Contexto:** Algunas relaciones (decisiones que tocan entidades heterogéneas) no encajan en FK rígidas.
- **Decisión:** El **único** polimorfismo permitido es `Decision.linked_entities` (JSONB). Todo lo demás se modela con FK estrictas.
- **Drivers:** habilitar el registro inmutable de decisiones sin romper la integridad relacional general.
- **Opciones consideradas:** (a) polimorfismo libre — rechazada por pérdida de integridad; (b) **polimorfismo único y acotado** — elegida.
- **Consecuencias (+):** flexibilidad localizada y auditable. **(−):** las relaciones en `linked_entities` no tienen FK; su validación es responsabilidad de aplicación.
- **Relaciones:** `constrained-by` CN-ADR-0010 y CN-ADR-0009; `relates-to` CN-ADR-0015.
- **Trazabilidad:** evidence → SPEC-001B §3.11, §"Relationship Model".

### CN-ADR-0012 — Clasificación por arquetipos como modelo organizador de entidades
- **decision_kind:** `architectural`
- **status:** Proposed
- **Contexto:** Las entidades reales necesitan una taxonomía estable que el Meta Model (001C) pueda derivar.
- **Decisión:** Adoptar seis **arquetipos** como clasificación canónica: **Container** (Project), **Structure** (System), **Knowledge Carrier** (Document, Circular), **Transactional** (BOM, Requirement, RFQ, Risk, Compliance), **Immutable** (Decision, Query), **Identity** (Profiles, Roles).
- **Drivers:** dar al Meta Model una base derivable; uniformar el tratamiento de entidades del mismo tipo.
- **Opciones consideradas:** (a) tratar cada entidad ad hoc — rechazada; (b) **clasificación por arquetipos** — elegida.
- **Consecuencias (+):** insumo directo y exclusivo para 001C; reglas por arquetipo. **(−):** algunas entidades pueden tensionar su arquetipo (ej. Compliance es transaccional pero también hub).
- **Relaciones:** `enables` SPEC-001C (Meta Model); `relates-to` CN-ADR-0013, CN-ADR-0015.
- **Trazabilidad:** evidence → SPEC-001B §"Arquetypes" (§12 de su Handoff).

### CN-ADR-0013 — Ciclos de vida explícitos por entidad (sin lifecycle unificado en este slice)
- **decision_kind:** `architectural`
- **status:** Proposed
- **Contexto:** Cada entidad transaccional tiene una máquina de estados propia; no existe (aún) un lifecycle común.
- **Decisión:** Definir lifecycles **por entidad** tal como están verificados: BOM Line (`draft → under_review → approved → rfq_sent → quoted → ordered → delivered`), Document (`pending → processing → indexed → error`), Requirement (`pending → in_review → compliant → non_compliant`), RFQ (`draft → sent → partial → complete → closed`), Risk (`open → mitigating → closed → accepted`). **No** se impone lifecycle unificado en este slice.
- **Drivers:** fidelidad al comportamiento real; no inventar estados.
- **Consecuencias (+):** modelo de consultas de estado fiable. **(−):** falta de uniformidad (registrado como open issue §4).
- **Relaciones:** `relates-to` CN-ADR-0012; abre RFC futura sobre lifecycle unificado.
- **Trazabilidad:** evidence → SPEC-001B §"Lifecycle Model".

### CN-ADR-0014 — Metadata de IA como atributos semánticos en fila
- **decision_kind:** `architectural`
- **status:** Proposed
- **Contexto:** Document y entidades portadoras de conocimiento ya almacenan campos derivados por IA.
- **Decisión:** La metadata de IA (`ai_summary`, `ai_tags`, `ai_manufacturers`, `ai_quantities`, `embedding`) se modela como **atributos semánticos en la propia entidad**, no como tablas separadas. Alimenta recuperación por embeddings e inferencia de trazabilidad.
- **Drivers:** retrieval semántico; co-localización del dato con su semántica.
- **Consecuencias (+):** KG con "semantic attributes" listos; RAG sobre el esquema real. **(−):** acoplamiento del ciclo de IA al ciclo de la entidad; reindexado al cambiar la fila.
- **Relaciones:** `constrained-by` CN-ADR-0010; `relates-to` CN-ADR-0009.
- **Trazabilidad:** evidence → SPEC-001B §"AI Metadata Model", §"Semantic Readiness".

### CN-ADR-0015 — Modelo temporal y de inmutabilidad
- **decision_kind:** `architectural`
- **status:** Proposed
- **Contexto:** Distintas entidades tienen distinta semántica temporal; Decision y Query son inmutables.
- **Decisión:** `created_at` **universal**; `updated_at` **solo en entidades mutables**; **domain timestamps** en entidades inmutables (`decided_at`, `answered_at`). Decision y Query son **registros inmutables** (arquetipo Immutable).
- **Drivers:** auditabilidad; semántica de evento para Decision; integridad histórica.
- **Consecuencias (+):** Decision modelable como "event-like node" en el KG; trazabilidad temporal consistente. **(−):** sin event log unificado todavía (open issue §4).
- **Relaciones:** `relates-to` CN-ADR-0012, CN-ADR-0011.
- **Trazabilidad:** evidence → SPEC-001B §"Temporal Model", §3.11, §3.10.

---

## 2. ADC — Índice de decisiones (vista de catálogo)

| ID | Título | Kind | Status | Entidades impactadas | Riesgo | Relaciones clave |
|---|---|---|---|---|---|---|
| CN-ADR-0008 | Reanclaje al esquema real | reversal | Proposed | (todas) | Medio | reverses v1.0.0; enables 0012 |
| CN-ADR-0009 | Compliance Item = hub | architectural | Proposed | compliance_matrix, requirements, documents, bom_lines | Medio | constrains 0011 |
| CN-ADR-0010 | Relacional estricto | architectural | Proposed | (todas) | Bajo | constrains 0011, 0014 |
| CN-ADR-0011 | Polimorfismo solo en Decision | architectural | Proposed | decisions | Bajo | constrained-by 0010, 0009 |
| CN-ADR-0012 | Arquetipos | architectural | Proposed | (todas) | Bajo | enables 001C |
| CN-ADR-0013 | Lifecycles por entidad | architectural | Proposed | bom_lines, documents, requirements, rfqs, risks | Medio | abre RFC lifecycle |
| CN-ADR-0014 | IA como atributos en fila | architectural | Proposed | documents, circulars | Medio | constrained-by 0010 |
| CN-ADR-0015 | Temporal + inmutabilidad | architectural | Proposed | decisions, project_queries | Bajo | relates 0012, 0011 |

## 2.1 Grafo de relaciones entre decisiones (aristas §7.4)

```
v1.0.0(ideal) ──reverses◄── 0008 ──enables──► 0012 ──enables──► [SPEC-001C / Meta Model]
                                   │
0010 ──constrains──► 0011          ├─relates─► 0013 ─(opens)─► RFC: lifecycle unificado
0010 ──constrains──► 0014          └─relates─► 0015
0009 ──constrains──► 0011
0009 ──relates────► 0010 / 0014
```

---

## 3. Carry-forward → SPEC-001C (Meta Model)

> Conforme al Handoff de 001B, el Meta Model debe derivarse **exclusivamente** de: arquetipos + invariantes reales + constraints de relación. Esto es lo único que pasa a 001C:

**Arquetipos (de CN-ADR-0012):** Container · Structure · Knowledge Carrier · Transactional · Immutable · Identity.

**Invariantes reales (de 0008/0009/0010/0011/0015):**
1. El modelo se ancla solo al esquema real verificado (sin Proposal/Bid/Approval).
2. Integridad referencial estricta; sin EAV ni schema dinámico.
3. JSONB acotado a `ai_quantities` y `linked_entities`.
4. Polimorfismo único en `Decision.linked_entities`.
5. `created_at` universal; `updated_at` solo en mutables; domain timestamps en inmutables.
6. Decision y Query son inmutables.

**Constraints de relación (de 0009/0010/0011):**
- Compliance Item es el hub central de trazabilidad.
- Todas las relaciones son FK estrictas, salvo el polimorfismo permitido.

**Prohibición que se traslada a 001C:** ninguna entidad futura (Proposal, Bid, Approval) ni meta-construcción puede introducirse en el Meta Model sin RFC/ADR propia.

---

## 4. Registro de deuda y open issues (NO son ADR)

Capturados desde 001B; no cumplen criterio de entrada al ADC pero quedan trazados. Candidatos a RFC/ADR futuras.

| Item | Origen | Destino sugerido |
|---|---|---|
| Estrategia de emisión de eventos indefinida | Open Issues / Tech Debt | RFC nueva |
| Esquema de `manufacturers` / `products` no verificado | §3.13 | bloquea trazas de fabricante; verificar antes de catalogar |
| Sin lifecycle unificado entre arquetipos | Open Issues | RFC abierta por CN-ADR-0013 |
| Acoplamiento compliance-status | Tech Debt | revisar bajo CN-ADR-0009 |
| `query.status` sin tipar (free text) | Tech Debt | normalización futura |
| Claridad de enforcement multi-tenant | Open Issues | requiere CN-SEC / decisión propia |

---

## 5. Estado del flujo

```
SPEC-000 (Biblioteca) ──────────── Frozen Baseline ✔
  1. SPEC-001A → ADC ............. (CN-ADR-0001…0007, asumido) ✔
  2. SPEC-001B → ADC ............. ESTE PAQUETE (CN-ADR-0008…0015, Proposed) ◀ AHORA
  3. SPEC-001C → Meta Model ...... pendiente (deriva del Carry-forward §3)
  4. Biblioteca como capa superior pendiente
```

## 6. Handoff para 001C
- **Entrada única autorizada:** §3 de este documento (arquetipos + invariantes + constraints).
- **Promoción de estado:** al aprobar SPEC-001B, las ADR 0008–0015 pasan a `Accepted` y el Meta Model puede consumirlas como base estable.
- **Pendiente de confirmación tuya:** el offset de numeración (¿001A cerró en 0007?) y si querés que estas ADR se materialicen como archivos individuales en `/03-decisions/adr/` además del índice de catálogo.
