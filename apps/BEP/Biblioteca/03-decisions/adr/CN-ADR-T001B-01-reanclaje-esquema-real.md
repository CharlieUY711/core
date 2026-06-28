---
document_id: "CN-ADR-T001B-01"
final_id: null   # TBD: asignar en integracion contra catalogo maestro (sin offsets)
document_type: ArchitectureDecisionRecord
title: "Re-anclar el Knowledge Model de BEP al esquema real verificado"
version: 0.1.0
status: Proposed
promotion_rule: "→ Accepted cuando SPEC-001B sea Approved"
decision_kind: "reversal"
risk_level: "Medio"
source_spec: "SPEC-001B (CN-KMODEL-0001)"
source_of_truth: "BEP-master.md §4"
source_sections: ["SPEC-001B CHANGE NOTE", "SPEC-001B §3 (Core Entities)"]
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
  - {type: "reverses", target: "KModel v1.0.0 (decision de modelado ideal)"}
  - {type: "enables", target: "CN-ADR-T001B-05"}
---

# CN-ADR-T001B-01 — Re-anclar el Knowledge Model de BEP al esquema real verificado

> **Estado:** Proposed (no promover a Accepted hasta aprobacion formal de SPEC-001B).
> **ID final:** pendiente de integracion contra el catalogo maestro (sin offsets asumidos).
> Este `.md` es **Source of Truth**. Editable a mano. Los artefactos derivados NO.

## Contexto
El KModel previo (v1.0.0) se apoyaba en entidades ideales no verificadas (Proposal, Bid, Approval). El dominio real operativo de BEP no las contiene.

## Decision
El Knowledge Model se reancla EXCLUSIVAMENTE al esquema real existente en BEP-master.md §4. Se eliminan Proposal, Bid y Approval como entidades del modelo.

## Drivers
- Corregir la fuente de verdad
- Eliminar deuda conceptual
- Alinear el conocimiento con la base de datos real

## Opciones consideradas
- (a) Mantener el modelo ideal y reconciliar luego — rechazada por divergencia creciente
- (b) Modelo hibrido ideal/real — rechazada por ambiguedad de autoridad
- (c) Reanclaje total al esquema real — ELEGIDA

## Consecuencias
**Positivas**
- Trazabilidad fiel al esquema real
- Base solida y verificada para 001C

**Negativas**
- Se pierde el vocabulario de propuesta/oferta/aprobacion hasta que existan como entidades reales
- Cualquier flujo que los asumia debe re-derivarse

## Relaciones
- `reverses` → KModel v1.0.0 (decision de modelado ideal)
- `enables` → CN-ADR-T001B-05

## Trazabilidad
- **Source spec:** SPEC-001B (CN-KMODEL-0001)
- **Source of truth:** BEP-master.md §4
- **Secciones de origen:** SPEC-001B CHANGE NOTE, SPEC-001B §3 (Core Entities)
- **Constrained-by:** SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)
- **Entidades impactadas:** (todas)

## Handoff
Prohibido reintroducir entidades futuras sin RFC/ADR propia.
