---
document_id: "CN-ADR-T001B-05"
final_id: null   # TBD: asignar en integracion contra catalogo maestro (sin offsets)
document_type: ArchitectureDecisionRecord
title: "Clasificacion por arquetipos como modelo organizador de entidades"
version: 0.1.0
status: Proposed
promotion_rule: "→ Accepted cuando SPEC-001B sea Approved"
decision_kind: "architectural"
risk_level: "Bajo"
source_spec: "SPEC-001B (CN-KMODEL-0001)"
source_of_truth: "BEP-master.md §4"
source_sections: ["SPEC-001B §Arquetypes"]
constrained_by: "SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)"
impacted_entities: ["(todas)"]
owner: "Enterprise Architecture Office (EAO)"
authors: ["Documentation Architect"]
classification: "Internal / Normative"
normative_level: MUST
implementation_status: Specified
created: "2026-06-27"
updated: "2026-06-27"
relations:
  - {type: "enables", target: "SPEC-001C (Meta Model)"}
  - {type: "relates-to", target: "CN-ADR-T001B-06"}
  - {type: "relates-to", target: "CN-ADR-T001B-08"}
---

# CN-ADR-T001B-05 — Clasificacion por arquetipos como modelo organizador de entidades

> **Estado:** Proposed (no promover a Accepted hasta aprobacion formal de SPEC-001B).
> **ID final:** pendiente de integracion contra el catalogo maestro (sin offsets asumidos).
> Este `.md` es **Source of Truth**. Editable a mano. Los artefactos derivados NO.

## Contexto
Las entidades reales necesitan una taxonomia estable que el Meta Model (001C) pueda derivar.

## Decision
Adoptar seis arquetipos canonicos: Container (Project), Structure (System), Knowledge Carrier (Document, Circular), Transactional (BOM, Requirement, RFQ, Risk, Compliance), Immutable (Decision, Query), Identity (Profiles, Roles).

## Drivers
- Dar al Meta Model una base derivable
- Uniformar el tratamiento de entidades del mismo tipo

## Opciones consideradas
- (a) Tratar cada entidad ad hoc — rechazada
- (b) Clasificacion por arquetipos — ELEGIDA

## Consecuencias
**Positivas**
- Insumo directo y exclusivo para 001C
- Reglas por arquetipo

**Negativas**
- Algunas entidades tensionan su arquetipo (ej. Compliance es transaccional pero tambien hub)

## Relaciones
- `enables` → SPEC-001C (Meta Model)
- `relates-to` → CN-ADR-T001B-06
- `relates-to` → CN-ADR-T001B-08

## Trazabilidad
- **Source spec:** SPEC-001B (CN-KMODEL-0001)
- **Source of truth:** BEP-master.md §4
- **Secciones de origen:** SPEC-001B §Arquetypes
- **Constrained-by:** SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)
- **Entidades impactadas:** (todas)

## Handoff
Arquetipos: entrada principal del carry-forward de 001C.
