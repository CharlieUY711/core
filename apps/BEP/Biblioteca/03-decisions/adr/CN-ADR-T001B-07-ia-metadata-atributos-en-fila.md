---
document_id: "CN-ADR-T001B-07"
final_id: null   # TBD: asignar en integracion contra catalogo maestro (sin offsets)
document_type: ArchitectureDecisionRecord
title: "Metadata de IA como atributos semanticos en fila"
version: 0.1.0
status: Proposed
promotion_rule: "→ Accepted cuando SPEC-001B sea Approved"
decision_kind: "architectural"
risk_level: "Medio"
source_spec: "SPEC-001B (CN-KMODEL-0001)"
source_of_truth: "BEP-master.md §4"
source_sections: ["SPEC-001B §AI Metadata Model", "SPEC-001B §Semantic Readiness"]
constrained_by: "SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)"
impacted_entities: ["documents", "circulars"]
owner: "Enterprise Architecture Office (EAO)"
authors: ["Documentation Architect"]
classification: "Internal / Normative"
normative_level: MUST
implementation_status: Specified
created: "2026-06-27"
updated: "2026-06-27"
relations:
  - {type: "constrained-by", target: "CN-ADR-T001B-03"}
  - {type: "relates-to", target: "CN-ADR-T001B-02"}
---

# CN-ADR-T001B-07 — Metadata de IA como atributos semanticos en fila

> **Estado:** Proposed (no promover a Accepted hasta aprobacion formal de SPEC-001B).
> **ID final:** pendiente de integracion contra el catalogo maestro (sin offsets asumidos).
> Este `.md` es **Source of Truth**. Editable a mano. Los artefactos derivados NO.

## Contexto
Document y entidades portadoras de conocimiento ya almacenan campos derivados por IA.

## Decision
La metadata de IA (ai_summary, ai_tags, ai_manufacturers, ai_quantities, embedding) se modela como atributos semanticos en la propia entidad, no como tablas separadas. Alimenta recuperacion por embeddings e inferencia de trazabilidad.

## Drivers
- Retrieval semantico
- Co-localizacion del dato con su semantica

## Opciones consideradas
- (a) Tablas separadas de metadata IA — rechazada por sobre-normalizacion
- (b) Atributos en fila — ELEGIDA

## Consecuencias
**Positivas**
- KG con semantic attributes listos
- RAG sobre el esquema real

**Negativas**
- Acoplamiento del ciclo de IA al ciclo de la entidad
- Reindexado al cambiar la fila

## Relaciones
- `constrained-by` → CN-ADR-T001B-03
- `relates-to` → CN-ADR-T001B-02

## Trazabilidad
- **Source spec:** SPEC-001B (CN-KMODEL-0001)
- **Source of truth:** BEP-master.md §4
- **Secciones de origen:** SPEC-001B §AI Metadata Model, SPEC-001B §Semantic Readiness
- **Constrained-by:** SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)
- **Entidades impactadas:** documents, circulars

## Handoff
No introduce infraestructura; el como del embedding pertenece a capas posteriores.
