# Dependency Graph — SPEC-001B (ADR)

> GENERADO. No editar a mano. Regenerar con `_tools/regen_derived.py` desde el front-matter de los ADR.

## Lista de adyacencia
- **CN-ADR-T001B-01**: reverses→KModel v1.0.0 (decision de modelado ideal); enables→CN-ADR-T001B-05
- **CN-ADR-T001B-02**: constrains→CN-ADR-T001B-04; relates-to→CN-ADR-T001B-03
- **CN-ADR-T001B-03**: constrains→CN-ADR-T001B-04; constrains→CN-ADR-T001B-07; relates-to→CN-ADR-T001B-02
- **CN-ADR-T001B-04**: constrained-by→CN-ADR-T001B-03; constrained-by→CN-ADR-T001B-02; relates-to→CN-ADR-T001B-08
- **CN-ADR-T001B-05**: enables→SPEC-001C (Meta Model); relates-to→CN-ADR-T001B-06; relates-to→CN-ADR-T001B-08
- **CN-ADR-T001B-06**: relates-to→CN-ADR-T001B-05; opens→RFC: lifecycle unificado entre arquetipos
- **CN-ADR-T001B-07**: constrained-by→CN-ADR-T001B-03; relates-to→CN-ADR-T001B-02
- **CN-ADR-T001B-08**: relates-to→CN-ADR-T001B-05; relates-to→CN-ADR-T001B-04
