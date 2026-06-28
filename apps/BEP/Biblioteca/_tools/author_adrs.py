#!/usr/bin/env python3
# AUTORIA de ADR (SPEC-001B). Emite SOLO archivos fuente: ADR *.md + README + AUTHORITY-MODEL.
# Los artefactos DERIVADOS NO se generan aqui: ver _tools/regen_derived.py
import os
BASE="/home/claude/library"; ADR=f"{BASE}/03-decisions/adr"
os.makedirs(ADR,exist_ok=True)
SOURCE="SPEC-001B (CN-KMODEL-0001)"; SOT="BEP-master.md §4"
CB="SPEC-000 / CN-CONST-0001@1.0.0 (Frozen Baseline)"

ADRS=[
 {"tid":"CN-ADR-T001B-01","slug":"reanclaje-esquema-real",
  "title":"Re-anclar el Knowledge Model de BEP al esquema real verificado",
  "kind":"reversal","risk":"Medio","entities":["(todas)"],
  "source_sections":["SPEC-001B CHANGE NOTE","SPEC-001B §3 (Core Entities)"],
  "context":"El KModel previo (v1.0.0) se apoyaba en entidades ideales no verificadas (Proposal, Bid, Approval). El dominio real operativo de BEP no las contiene.",
  "decision":"El Knowledge Model se reancla EXCLUSIVAMENTE al esquema real existente en BEP-master.md §4. Se eliminan Proposal, Bid y Approval como entidades del modelo.",
  "drivers":["Corregir la fuente de verdad","Eliminar deuda conceptual","Alinear el conocimiento con la base de datos real"],
  "options":["(a) Mantener el modelo ideal y reconciliar luego — rechazada por divergencia creciente","(b) Modelo hibrido ideal/real — rechazada por ambiguedad de autoridad","(c) Reanclaje total al esquema real — ELEGIDA"],
  "pos":["Trazabilidad fiel al esquema real","Base solida y verificada para 001C"],
  "neg":["Se pierde el vocabulario de propuesta/oferta/aprobacion hasta que existan como entidades reales","Cualquier flujo que los asumia debe re-derivarse"],
  "relations":[("reverses","KModel v1.0.0 (decision de modelado ideal)"),("enables","CN-ADR-T001B-05")],
  "handoff":"Prohibido reintroducir entidades futuras sin RFC/ADR propia."},
 {"tid":"CN-ADR-T001B-02","slug":"compliance-item-hub",
  "title":"Compliance Item como hub central de trazabilidad",
  "kind":"architectural","risk":"Medio",
  "entities":["compliance_matrix","requirements","documents","bom_lines","manufacturers"],
  "source_sections":["SPEC-001B §3.6","SPEC-001B §Relationship Model","SPEC-001B §Knowledge Graph Foundation"],
  "context":"La trazabilidad del dominio (requisito ↔ documento ↔ BOM ↔ fabricante ↔ evidencia) necesita un punto de convergencia unico.",
  "decision":"compliance_matrix (Compliance Item) es el hub central: concentra las FK hacia requirement_id, document_id, bom_line_id, manufacturer_id y porta evidence/status.",
  "drivers":["Trazabilidad de extremo a extremo","Consultas de cumplimiento","Un unico lugar de verdad para el estado de conformidad"],
  "options":["(a) Trazabilidad distribuida en cada entidad — rechazada por dispersion","(b) Hub unico — ELEGIDA"],
  "pos":["Consultas de cumplimiento y cadenas de trazabilidad simples","Mapeo natural a hub node en el Knowledge Graph"],
  "neg":["Punto de acoplamiento","Riesgo de sobrecarga del hub (deuda: compliance-status coupling)"],
  "relations":[("constrains","CN-ADR-T001B-04"),("relates-to","CN-ADR-T001B-03")],
  "handoff":"El hub es invariante de relacion; pasa al carry-forward de 001C. NOTA: manufacturers no verificado (§3.13)."},
 {"tid":"CN-ADR-T001B-03","slug":"modelo-relacional-estricto",
  "title":"Modelo de datos estrictamente relacional (FK-first, sin EAV ni schema dinamico)",
  "kind":"architectural","risk":"Bajo","entities":["(todas)"],
  "source_sections":["SPEC-001B §Data Model Constraints"],
  "context":"El dominio exige integridad referencial fuerte y consultas predecibles.",
  "decision":"Modelo relational-first con FK estructurales estrictas; prohibido EAV; prohibido schema dinamico; JSONB solo para extensiones controladas (ai_quantities, linked_entities).",
  "drivers":["Integridad referencial","Predictibilidad de consultas","Evitar deuda de modelado flexible"],
  "options":["(a) EAV / atributos dinamicos — rechazada","(b) Relacional estricto con JSONB acotado — ELEGIDA"],
  "pos":["Integridad garantizada","Base limpia para los invariantes del Meta Model"],
  "neg":["Menos flexibilidad ad hoc","Cada extension requiere decision explicita"],
  "relations":[("constrains","CN-ADR-T001B-04"),("constrains","CN-ADR-T001B-07"),("relates-to","CN-ADR-T001B-02")],
  "handoff":"Invariante de relacion; pasa al carry-forward de 001C."},
 {"tid":"CN-ADR-T001B-04","slug":"polimorfismo-decision-linked-entities",
  "title":"Polimorfismo confinado a Decision.linked_entities",
  "kind":"architectural","risk":"Bajo","entities":["decisions"],
  "source_sections":["SPEC-001B §3.11","SPEC-001B §Relationship Model"],
  "context":"Algunas relaciones (decisiones que tocan entidades heterogeneas) no encajan en FK rigidas.",
  "decision":"El unico polimorfismo permitido es Decision.linked_entities (JSONB). Todo lo demas se modela con FK estrictas.",
  "drivers":["Habilitar el registro inmutable de decisiones sin romper la integridad relacional general"],
  "options":["(a) Polimorfismo libre — rechazada por perdida de integridad","(b) Polimorfismo unico y acotado — ELEGIDA"],
  "pos":["Flexibilidad localizada y auditable"],
  "neg":["Las relaciones en linked_entities no tienen FK; su validacion es responsabilidad de aplicacion"],
  "relations":[("constrained-by","CN-ADR-T001B-03"),("constrained-by","CN-ADR-T001B-02"),("relates-to","CN-ADR-T001B-08")],
  "handoff":"Constraint de relacion; pasa al carry-forward de 001C."},
 {"tid":"CN-ADR-T001B-05","slug":"clasificacion-arquetipos",
  "title":"Clasificacion por arquetipos como modelo organizador de entidades",
  "kind":"architectural","risk":"Bajo","entities":["(todas)"],
  "source_sections":["SPEC-001B §Arquetypes"],
  "context":"Las entidades reales necesitan una taxonomia estable que el Meta Model (001C) pueda derivar.",
  "decision":"Adoptar seis arquetipos canonicos: Container (Project), Structure (System), Knowledge Carrier (Document, Circular), Transactional (BOM, Requirement, RFQ, Risk, Compliance), Immutable (Decision, Query), Identity (Profiles, Roles).",
  "drivers":["Dar al Meta Model una base derivable","Uniformar el tratamiento de entidades del mismo tipo"],
  "options":["(a) Tratar cada entidad ad hoc — rechazada","(b) Clasificacion por arquetipos — ELEGIDA"],
  "pos":["Insumo directo y exclusivo para 001C","Reglas por arquetipo"],
  "neg":["Algunas entidades tensionan su arquetipo (ej. Compliance es transaccional pero tambien hub)"],
  "relations":[("enables","SPEC-001C (Meta Model)"),("relates-to","CN-ADR-T001B-06"),("relates-to","CN-ADR-T001B-08")],
  "handoff":"Arquetipos: entrada principal del carry-forward de 001C."},
 {"tid":"CN-ADR-T001B-06","slug":"lifecycles-por-entidad",
  "title":"Ciclos de vida explicitos por entidad (sin lifecycle unificado en este slice)",
  "kind":"architectural","risk":"Medio",
  "entities":["bom_lines","documents","requirements","rfqs","risks"],
  "source_sections":["SPEC-001B §Lifecycle Model"],
  "context":"Cada entidad transaccional tiene una maquina de estados propia; no existe (aun) un lifecycle comun.",
  "decision":"Definir lifecycles por entidad tal como estan verificados: BOM Line (draft → under_review → approved → rfq_sent → quoted → ordered → delivered); Document (pending → processing → indexed → error); Requirement (pending → in_review → compliant → non_compliant); RFQ (draft → sent → partial → complete → closed); Risk (open → mitigating → closed → accepted). No se impone lifecycle unificado en este slice.",
  "drivers":["Fidelidad al comportamiento real","No inventar estados"],
  "options":["(a) Lifecycle unificado forzado — rechazada por falta de verificacion","(b) Lifecycle por entidad segun lo real — ELEGIDA"],
  "pos":["Modelo de consultas de estado fiable"],
  "neg":["Falta de uniformidad (registrado como open issue / backlog)"],
  "relations":[("relates-to","CN-ADR-T001B-05"),("opens","RFC: lifecycle unificado entre arquetipos")],
  "handoff":"El lifecycle unificado NO entra a 001C; queda como RFC futura."},
 {"tid":"CN-ADR-T001B-07","slug":"ia-metadata-atributos-en-fila",
  "title":"Metadata de IA como atributos semanticos en fila",
  "kind":"architectural","risk":"Medio","entities":["documents","circulars"],
  "source_sections":["SPEC-001B §AI Metadata Model","SPEC-001B §Semantic Readiness"],
  "context":"Document y entidades portadoras de conocimiento ya almacenan campos derivados por IA.",
  "decision":"La metadata de IA (ai_summary, ai_tags, ai_manufacturers, ai_quantities, embedding) se modela como atributos semanticos en la propia entidad, no como tablas separadas. Alimenta recuperacion por embeddings e inferencia de trazabilidad.",
  "drivers":["Retrieval semantico","Co-localizacion del dato con su semantica"],
  "options":["(a) Tablas separadas de metadata IA — rechazada por sobre-normalizacion","(b) Atributos en fila — ELEGIDA"],
  "pos":["KG con semantic attributes listos","RAG sobre el esquema real"],
  "neg":["Acoplamiento del ciclo de IA al ciclo de la entidad","Reindexado al cambiar la fila"],
  "relations":[("constrained-by","CN-ADR-T001B-03"),("relates-to","CN-ADR-T001B-02")],
  "handoff":"No introduce infraestructura; el como del embedding pertenece a capas posteriores."},
 {"tid":"CN-ADR-T001B-08","slug":"modelo-temporal-inmutabilidad",
  "title":"Modelo temporal y de inmutabilidad",
  "kind":"architectural","risk":"Bajo","entities":["decisions","project_queries"],
  "source_sections":["SPEC-001B §Temporal Model","SPEC-001B §3.11","SPEC-001B §3.10"],
  "context":"Distintas entidades tienen distinta semantica temporal; Decision y Query son inmutables.",
  "decision":"created_at universal; updated_at solo en entidades mutables; domain timestamps en entidades inmutables (decided_at, answered_at). Decision y Query son registros inmutables (arquetipo Immutable).",
  "drivers":["Auditabilidad","Semantica de evento para Decision","Integridad historica"],
  "options":["(a) updated_at universal — rechazada por contradecir inmutabilidad","(b) Modelo temporal diferenciado por arquetipo — ELEGIDA"],
  "pos":["Decision modelable como event-like node en el KG","Trazabilidad temporal consistente"],
  "neg":["Sin event log unificado todavia (open issue / backlog)"],
  "relations":[("relates-to","CN-ADR-T001B-05"),("relates-to","CN-ADR-T001B-04")],
  "handoff":"La inmutabilidad es invariante real; pasa a 001C. El event log NO (backlog)."},
]

def q(lst): return "[" + ", ".join(f'"{x}"' for x in lst) + "]"
def lines(lst): return "\n".join(f"- {x}" for x in lst)

def adr_md(a):
    rel_fm="\n".join(f'  - {{type: "{t}", target: "{d}"}}' for t,d in a["relations"])
    rel_body="\n".join(f"- `{t}` → {d}" for t,d in a["relations"])
    fm=f"""---
document_id: "{a['tid']}"
final_id: null   # TBD: asignar en integracion contra catalogo maestro (sin offsets)
document_type: ArchitectureDecisionRecord
title: "{a['title']}"
version: 0.1.0
status: Proposed
promotion_rule: "→ Accepted cuando SPEC-001B sea Approved"
decision_kind: "{a['kind']}"
risk_level: "{a['risk']}"
source_spec: "{SOURCE}"
source_of_truth: "{SOT}"
source_sections: {q(a['source_sections'])}
constrained_by: "{CB}"
impacted_entities: {q(a['entities'])}
owner: "Enterprise Architecture Office (EAO)"
authors: ["Documentation Architect"]
classification: "Internal / Normative"
normative_level: MUST
implementation_status: Specified
created: "2026-06-27"
updated: "2026-06-27"
relations:
{rel_fm}
---"""
    body=f"""

# {a['tid']} — {a['title']}

> **Estado:** Proposed (no promover a Accepted hasta aprobacion formal de SPEC-001B).
> **ID final:** pendiente de integracion contra el catalogo maestro (sin offsets asumidos).
> Este `.md` es **Source of Truth**. Editable a mano. Los artefactos derivados NO.

## Contexto
{a['context']}

## Decision
{a['decision']}

## Drivers
{lines(a['drivers'])}

## Opciones consideradas
{lines(a['options'])}

## Consecuencias
**Positivas**
{lines(a['pos'])}

**Negativas**
{lines(a['neg'])}

## Relaciones
{rel_body}

## Trazabilidad
- **Source spec:** {SOURCE}
- **Source of truth:** {SOT}
- **Secciones de origen:** {", ".join(a['source_sections'])}
- **Constrained-by:** {CB}
- **Entidades impactadas:** {", ".join(a['entities'])}

## Handoff
{a['handoff']}
"""
    return fm+body

for a in ADRS:
    with open(f"{ADR}/{a['tid']}-{a['slug']}.md","w") as f: f.write(adr_md(a))

# README (autoria, no derivado)
with open(f"{ADR}/README.md","w") as f: f.write(f"""# /03-decisions/adr — Materializacion SPEC-001B

{len(ADRS)} ADR derivados de SPEC-001B, cada uno documento independiente (Source of Truth).

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
""")

# Nota de autoridad (autoria, no derivado)
with open(f"{BASE}/03-decisions/adr/AUTHORITY-MODEL.md","w") as f: f.write("""# Modelo de Autoridad Documental

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
""")
print(f"Autoria OK: {len(ADRS)} ADR + README + AUTHORITY-MODEL")
