---
document_id: "CN-ADR-T001B-06"
final_id: null   # TBD: asignar en integracion contra catalogo maestro (sin offsets)
document_type: ArchitectureDecisionRecord
title: "Ciclos de vida explicitos por entidad (sin lifecycle unificado en este slice)"
version: 0.1.0
status: Proposed
promotion_rule: "→ Accepted cuando SPEC-001B sea Approved"
decision_kind: "architectural"
risk_level: "Medio"
source_spec: "SPEC-001B (CN-KMODEL-0001)"
source_of_truth: "BEP-master.md §4"
source_sections: ["SPEC-001B §Lifecycle Model"]
constrained_by: "SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)"
impacted_entities: ["bom_lines", "documents", "requirements", "rfqs", "risks"]
owner: "Enterprise Architecture Office (EAO)"
authors: ["Documentation Architect"]
classification: "Internal / Normative"
normative_level: MUST
implementation_status: Specified
created: "2026-06-27"
updated: "2026-06-27"
relations:
  - {type: "relates-to", target: "CN-ADR-T001B-05"}
  - {type: "opens", target: "RFC: lifecycle unificado entre arquetipos"}
---

# CN-ADR-T001B-06 — Ciclos de vida explicitos por entidad (sin lifecycle unificado en este slice)

> **Estado:** Proposed (no promover a Accepted hasta aprobacion formal de SPEC-001B).
> **ID final:** pendiente de integracion contra el catalogo maestro (sin offsets asumidos).
> Este `.md` es **Source of Truth**. Editable a mano. Los artefactos derivados NO.

## Contexto
Cada entidad transaccional tiene una maquina de estados propia; no existe (aun) un lifecycle comun.

## Decision
Definir lifecycles por entidad tal como estan verificados: BOM Line (draft → under_review → approved → rfq_sent → quoted → ordered → delivered); Document (pending → processing → indexed → error); Requirement (pending → in_review → compliant → non_compliant); RFQ (draft → sent → partial → complete → closed); Risk (open → mitigating → closed → accepted). No se impone lifecycle unificado en este slice.

## Drivers
- Fidelidad al comportamiento real
- No inventar estados

## Opciones consideradas
- (a) Lifecycle unificado forzado — rechazada por falta de verificacion
- (b) Lifecycle por entidad segun lo real — ELEGIDA

## Consecuencias
**Positivas**
- Modelo de consultas de estado fiable

**Negativas**
- Falta de uniformidad (registrado como open issue / backlog)

## Relaciones
- `relates-to` → CN-ADR-T001B-05
- `opens` → RFC: lifecycle unificado entre arquetipos

## Trazabilidad
- **Source spec:** SPEC-001B (CN-KMODEL-0001)
- **Source of truth:** BEP-master.md §4
- **Secciones de origen:** SPEC-001B §Lifecycle Model
- **Constrained-by:** SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)
- **Entidades impactadas:** bom_lines, documents, requirements, rfqs, risks

## Handoff
El lifecycle unificado NO entra a 001C; queda como RFC futura.
