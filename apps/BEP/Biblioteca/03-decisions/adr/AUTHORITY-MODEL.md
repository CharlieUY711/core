# Modelo de Autoridad Documental

| # | Artefacto | Rol |
|---|---|---|
| 1 | ADR `*.md` | **Source of Truth** |
| 2 | Indices `*.json` | Derivado |
| 3 | Catalogos `*.md` | Derivado |
| 4 | Graphs | Derivado |
| 5 | Traceability | Derivado |

**Invariantes:**
- Ningun artefacto derivado se edita manualmente.
- Toda regeneracion parte exclusivamente del front-matter de los ADR.
- El mecanismo unico de regeneracion es `_tools/regen_derived.py` (lee solo `*.md`).
