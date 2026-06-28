# Indice Maestro de ADR — SPEC-001B

> GENERADO. No editar a mano. Regenerar con `_tools/regen_derived.py` desde el front-matter de los ADR.

| Temp ID | Final ID | Titulo | Kind | Status | Entidades impactadas | Riesgo |
|---|---|---|---|---|---|---|
| CN-ADR-T001B-01 | TBD | Re-anclar el Knowledge Model de BEP al esquema real verificado | reversal | Proposed | (todas) | Medio |
| CN-ADR-T001B-02 | TBD | Compliance Item como hub central de trazabilidad | architectural | Proposed | compliance_matrix, requirements, documents, bom_lines, manufacturers | Medio |
| CN-ADR-T001B-03 | TBD | Modelo de datos estrictamente relacional (FK-first, sin EAV ni schema dinamico) | architectural | Proposed | (todas) | Bajo |
| CN-ADR-T001B-04 | TBD | Polimorfismo confinado a Decision.linked_entities | architectural | Proposed | decisions | Bajo |
| CN-ADR-T001B-05 | TBD | Clasificacion por arquetipos como modelo organizador de entidades | architectural | Proposed | (todas) | Bajo |
| CN-ADR-T001B-06 | TBD | Ciclos de vida explicitos por entidad (sin lifecycle unificado en este slice) | architectural | Proposed | bom_lines, documents, requirements, rfqs, risks | Medio |
| CN-ADR-T001B-07 | TBD | Metadata de IA como atributos semanticos en fila | architectural | Proposed | documents, circulars | Medio |
| CN-ADR-T001B-08 | TBD | Modelo temporal y de inmutabilidad | architectural | Proposed | decisions, project_queries | Bajo |

**Total:** 8 ADR. **Origen:** SPEC-001B (CN-KMODEL-0001). **Constrained-by:** SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline).

## Regla de numeracion
1. Sin offsets. 2. Final calculada contra el catalogo maestro. 3. Mientras tanto rigen los IDs `CN-ADR-T001B-NN`. 4. Asignacion final unica en integracion.
