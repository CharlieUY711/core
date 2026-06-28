---
document_id: "CN-ADR-T001B-08"
final_id: null   # TBD: asignar en integracion contra catalogo maestro (sin offsets)
document_type: ArchitectureDecisionRecord
title: "Modelo temporal y de inmutabilidad"
version: 0.1.0
status: Proposed
promotion_rule: "→ Accepted cuando SPEC-001B sea Approved"
decision_kind: "architectural"
risk_level: "Bajo"
source_spec: "SPEC-001B (CN-KMODEL-0001)"
source_of_truth: "BEP-master.md §4"
source_sections: ["SPEC-001B §Temporal Model", "SPEC-001B §3.11", "SPEC-001B §3.10"]
constrained_by: "SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)"
impacted_entities: ["decisions", "project_queries"]
owner: "Enterprise Architecture Office (EAO)"
authors: ["Documentation Architect"]
classification: "Internal / Normative"
normative_level: MUST
implementation_status: Specified
created: "2026-06-27"
updated: "2026-06-27"
relations:
  - {type: "relates-to", target: "CN-ADR-T001B-05"}
  - {type: "relates-to", target: "CN-ADR-T001B-04"}
---

# CN-ADR-T001B-08 — Modelo temporal y de inmutabilidad

> **Estado:** Proposed (no promover a Accepted hasta aprobacion formal de SPEC-001B).
> **ID final:** pendiente de integracion contra el catalogo maestro (sin offsets asumidos).
> Este `.md` es **Source of Truth**. Editable a mano. Los artefactos derivados NO.

## Contexto
Distintas entidades tienen distinta semantica temporal; Decision y Query son inmutables.

## Decision
created_at universal; updated_at solo en entidades mutables; domain timestamps en entidades inmutables (decided_at, answered_at). Decision y Query son registros inmutables (arquetipo Immutable).

## Drivers
- Auditabilidad
- Semantica de evento para Decision
- Integridad historica

## Opciones consideradas
- (a) updated_at universal — rechazada por contradecir inmutabilidad
- (b) Modelo temporal diferenciado por arquetipo — ELEGIDA

## Consecuencias
**Positivas**
- Decision modelable como event-like node en el KG
- Trazabilidad temporal consistente

**Negativas**
- Sin event log unificado todavia (open issue / backlog)

## Relaciones
- `relates-to` → CN-ADR-T001B-05
- `relates-to` → CN-ADR-T001B-04

## Trazabilidad
- **Source spec:** SPEC-001B (CN-KMODEL-0001)
- **Source of truth:** BEP-master.md §4
- **Secciones de origen:** SPEC-001B §Temporal Model, SPEC-001B §3.11, SPEC-001B §3.10
- **Constrained-by:** SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)
- **Entidades impactadas:** decisions, project_queries

## Handoff
La inmutabilidad es invariante real; pasa a 001C. El event log NO (backlog).
