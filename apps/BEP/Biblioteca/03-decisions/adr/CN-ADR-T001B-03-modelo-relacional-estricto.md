---
document_id: "CN-ADR-T001B-03"
final_id: null   # TBD: asignar en integracion contra catalogo maestro (sin offsets)
document_type: ArchitectureDecisionRecord
title: "Modelo de datos estrictamente relacional (FK-first, sin EAV ni schema dinamico)"
version: 0.1.0
status: Proposed
promotion_rule: "→ Accepted cuando SPEC-001B sea Approved"
decision_kind: "architectural"
risk_level: "Bajo"
source_spec: "SPEC-001B (CN-KMODEL-0001)"
source_of_truth: "BEP-master.md §4"
source_sections: ["SPEC-001B §Data Model Constraints"]
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
  - {type: "constrains", target: "CN-ADR-T001B-04"}
  - {type: "constrains", target: "CN-ADR-T001B-07"}
  - {type: "relates-to", target: "CN-ADR-T001B-02"}
---

# CN-ADR-T001B-03 — Modelo de datos estrictamente relacional (FK-first, sin EAV ni schema dinamico)

> **Estado:** Proposed (no promover a Accepted hasta aprobacion formal de SPEC-001B).
> **ID final:** pendiente de integracion contra el catalogo maestro (sin offsets asumidos).
> Este `.md` es **Source of Truth**. Editable a mano. Los artefactos derivados NO.

## Contexto
El dominio exige integridad referencial fuerte y consultas predecibles.

## Decision
Modelo relational-first con FK estructurales estrictas; prohibido EAV; prohibido schema dinamico; JSONB solo para extensiones controladas (ai_quantities, linked_entities).

## Drivers
- Integridad referencial
- Predictibilidad de consultas
- Evitar deuda de modelado flexible

## Opciones consideradas
- (a) EAV / atributos dinamicos — rechazada
- (b) Relacional estricto con JSONB acotado — ELEGIDA

## Consecuencias
**Positivas**
- Integridad garantizada
- Base limpia para los invariantes del Meta Model

**Negativas**
- Menos flexibilidad ad hoc
- Cada extension requiere decision explicita

## Relaciones
- `constrains` → CN-ADR-T001B-04
- `constrains` → CN-ADR-T001B-07
- `relates-to` → CN-ADR-T001B-02

## Trazabilidad
- **Source spec:** SPEC-001B (CN-KMODEL-0001)
- **Source of truth:** BEP-master.md §4
- **Secciones de origen:** SPEC-001B §Data Model Constraints
- **Constrained-by:** SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)
- **Entidades impactadas:** (todas)

## Handoff
Invariante de relacion; pasa al carry-forward de 001C.
