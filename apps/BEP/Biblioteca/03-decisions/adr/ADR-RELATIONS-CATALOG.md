# Catalogo de Relaciones entre Decisiones — SPEC-001B

> GENERADO. No editar a mano. Regenerar con `_tools/regen_derived.py` desde el front-matter de los ADR.

| Origen | Relacion | Destino |
|---|---|---|
| CN-ADR-T001B-01 | `reverses` | KModel v1.0.0 (decision de modelado ideal) |
| CN-ADR-T001B-01 | `enables` | CN-ADR-T001B-05 |
| CN-ADR-T001B-02 | `constrains` | CN-ADR-T001B-04 |
| CN-ADR-T001B-02 | `relates-to` | CN-ADR-T001B-03 |
| CN-ADR-T001B-03 | `constrains` | CN-ADR-T001B-04 |
| CN-ADR-T001B-03 | `constrains` | CN-ADR-T001B-07 |
| CN-ADR-T001B-03 | `relates-to` | CN-ADR-T001B-02 |
| CN-ADR-T001B-04 | `constrained-by` | CN-ADR-T001B-03 |
| CN-ADR-T001B-04 | `constrained-by` | CN-ADR-T001B-02 |
| CN-ADR-T001B-04 | `relates-to` | CN-ADR-T001B-08 |
| CN-ADR-T001B-05 | `enables` | SPEC-001C (Meta Model) |
| CN-ADR-T001B-05 | `relates-to` | CN-ADR-T001B-06 |
| CN-ADR-T001B-05 | `relates-to` | CN-ADR-T001B-08 |
| CN-ADR-T001B-06 | `relates-to` | CN-ADR-T001B-05 |
| CN-ADR-T001B-06 | `opens` | RFC: lifecycle unificado entre arquetipos |
| CN-ADR-T001B-07 | `constrained-by` | CN-ADR-T001B-03 |
| CN-ADR-T001B-07 | `relates-to` | CN-ADR-T001B-02 |
| CN-ADR-T001B-08 | `relates-to` | CN-ADR-T001B-05 |
| CN-ADR-T001B-08 | `relates-to` | CN-ADR-T001B-04 |

**Total de aristas:** 19.
