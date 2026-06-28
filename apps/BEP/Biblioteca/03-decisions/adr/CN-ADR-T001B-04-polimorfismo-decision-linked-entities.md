---
document_id: "CN-ADR-T001B-04"
final_id: null   # TBD: asignar en integracion contra catalogo maestro (sin offsets)
document_type: ArchitectureDecisionRecord
title: "Polimorfismo confinado a Decision.linked_entities"
version: 0.1.0
status: Proposed
promotion_rule: "→ Accepted cuando SPEC-001B sea Approved"
decision_kind: "architectural"
risk_level: "Bajo"
source_spec: "SPEC-001B (CN-KMODEL-0001)"
source_of_truth: "BEP-master.md §4"
source_sections: ["SPEC-001B §3.11", "SPEC-001B §Relationship Model"]
constrained_by: "SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)"
impacted_entities: ["decisions"]
owner: "Enterprise Architecture Office (EAO)"
authors: ["Documentation Architect"]
classification: "Internal / Normative"
normative_level: MUST
implementation_status: Specified
created: "2026-06-27"
updated: "2026-06-27"
relations:
  - {type: "constrained-by", target: "CN-ADR-T001B-03"}
  - {type: "constrained-by", target: "CN-ADR-T001B-02"}
  - {type: "relates-to", target: "CN-ADR-T001B-08"}
---

# CN-ADR-T001B-04 — Polimorfismo confinado a Decision.linked_entities

> **Estado:** Proposed (no promover a Accepted hasta aprobacion formal de SPEC-001B).
> **ID final:** pendiente de integracion contra el catalogo maestro (sin offsets asumidos).
> Este `.md` es **Source of Truth**. Editable a mano. Los artefactos derivados NO.

## Contexto
Algunas relaciones (decisiones que tocan entidades heterogeneas) no encajan en FK rigidas.

## Decision
El unico polimorfismo permitido es Decision.linked_entities (JSONB). Todo lo demas se modela con FK estrictas.

## Drivers
- Habilitar el registro inmutable de decisiones sin romper la integridad relacional general

## Opciones consideradas
- (a) Polimorfismo libre — rechazada por perdida de integridad
- (b) Polimorfismo unico y acotado — ELEGIDA

## Consecuencias
**Positivas**
- Flexibilidad localizada y auditable

**Negativas**
- Las relaciones en linked_entities no tienen FK; su validacion es responsabilidad de aplicacion

## Relaciones
- `constrained-by` → CN-ADR-T001B-03
- `constrained-by` → CN-ADR-T001B-02
- `relates-to` → CN-ADR-T001B-08

## Trazabilidad
- **Source spec:** SPEC-001B (CN-KMODEL-0001)
- **Source of truth:** BEP-master.md §4
- **Secciones de origen:** SPEC-001B §3.11, SPEC-001B §Relationship Model
- **Constrained-by:** SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)
- **Entidades impactadas:** decisions

## Handoff
Constraint de relacion; pasa al carry-forward de 001C.
