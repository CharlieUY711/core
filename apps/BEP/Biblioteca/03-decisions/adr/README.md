# /03-decisions/adr — Materializacion SPEC-001B

8 ADR derivados de SPEC-001B, cada uno documento independiente (Source of Truth).

## Modelo de autoridad documental (vigente)
1. **ADR `*.md` → Source of Truth.** Unicos editables a mano.
2. **Indices `*.json` → derivados.**
3. **Catalogos `*.md` → derivados.**
4. **Graphs → derivados.**
5. **Traceability → derivado.**

Ningun artefacto derivado puede editarse manualmente.
Toda regeneracion parte EXCLUSIVAMENTE del front-matter de los ADR, via `_tools/regen_derived.py`.

## Reglas de gobernanza
- Status = Proposed en todos. No promover hasta aprobacion de SPEC-001B.
- Numeracion temporal `CN-ADR-T001B-NN`. Final asignada solo en integracion. Sin offsets.
- Open issues / technical debt NO se convierten en ADR (van a RFC/backlog).

## Proximo paso
SPEC-001C (Meta Model), derivado SOLO de arquetipos + invariantes + constraints de relacion.
Prohibido: entidades futuras, tablas, implementacion, SQL, eventos, infraestructura.
