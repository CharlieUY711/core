---
document_id: "CN-ADR-T001B-02"
final_id: null   # TBD: asignar en integracion contra catalogo maestro (sin offsets)
document_type: ArchitectureDecisionRecord
title: "Compliance Item como hub central de trazabilidad"
version: 0.1.0
status: Proposed
promotion_rule: "→ Accepted cuando SPEC-001B sea Approved"
decision_kind: "architectural"
risk_level: "Medio"
source_spec: "SPEC-001B (CN-KMODEL-0001)"
source_of_truth: "BEP-master.md §4"
source_sections: ["SPEC-001B §3.6", "SPEC-001B §Relationship Model", "SPEC-001B §Knowledge Graph Foundation"]
constrained_by: "SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)"
impacted_entities: ["compliance_matrix", "requirements", "documents", "bom_lines", "manufacturers"]
owner: "Enterprise Architecture Office (EAO)"
authors: ["Documentation Architect"]
classification: "Internal / Normative"
normative_level: MUST
implementation_status: Specified
created: "2026-06-27"
updated: "2026-06-27"
relations:
  - {type: "constrains", target: "CN-ADR-T001B-04"}
  - {type: "relates-to", target: "CN-ADR-T001B-03"}
---

# CN-ADR-T001B-02 — Compliance Item como hub central de trazabilidad

> **Estado:** Proposed (no promover a Accepted hasta aprobacion formal de SPEC-001B).
> **ID final:** pendiente de integracion contra el catalogo maestro (sin offsets asumidos).
> Este `.md` es **Source of Truth**. Editable a mano. Los artefactos derivados NO.

## Contexto
La trazabilidad del dominio (requisito ↔ documento ↔ BOM ↔ fabricante ↔ evidencia) necesita un punto de convergencia unico.

## Decision
compliance_matrix (Compliance Item) es el hub central: concentra las FK hacia requirement_id, document_id, bom_line_id, manufacturer_id y porta evidence/status.

## Drivers
- Trazabilidad de extremo a extremo
- Consultas de cumplimiento
- Un unico lugar de verdad para el estado de conformidad

## Opciones consideradas
- (a) Trazabilidad distribuida en cada entidad — rechazada por dispersion
- (b) Hub unico — ELEGIDA

## Consecuencias
**Positivas**
- Consultas de cumplimiento y cadenas de trazabilidad simples
- Mapeo natural a hub node en el Knowledge Graph

**Negativas**
- Punto de acoplamiento
- Riesgo de sobrecarga del hub (deuda: compliance-status coupling)

## Relaciones
- `constrains` → CN-ADR-T001B-04
- `relates-to` → CN-ADR-T001B-03

## Trazabilidad
- **Source spec:** SPEC-001B (CN-KMODEL-0001)
- **Source of truth:** BEP-master.md §4
- **Secciones de origen:** SPEC-001B §3.6, SPEC-001B §Relationship Model, SPEC-001B §Knowledge Graph Foundation
- **Constrained-by:** SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)
- **Entidades impactadas:** compliance_matrix, requirements, documents, bom_lines, manufacturers

## Handoff
El hub es invariante de relacion; pasa al carry-forward de 001C. NOTA: manufacturers no verificado (§3.13).
