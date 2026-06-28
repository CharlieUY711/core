#!/usr/bin/env python3
# REGENERADOR DE DERIVADOS. Lee EXCLUSIVAMENTE el front-matter YAML de los ADR *.md.
# No contiene contenido propio: si un dato no esta en el front-matter, no existe aqui.
# Salidas: ADR-MASTER-INDEX.md, ADR-RELATIONS-CATALOG.md, ADR-DEPENDENCY-GRAPH.md,
#          TRACEABILITY-001B.md  +  espejos JSON en _indexes/.
import os, glob, json, yaml

BASE=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../library
ADR=f"{BASE}/03-decisions/adr"; IDX=f"{BASE}/_indexes"
os.makedirs(IDX,exist_ok=True)

DO_NOT_EDIT="> GENERADO. No editar a mano. Regenerar con `_tools/regen_derived.py` desde el front-matter de los ADR.\n\n"

def load_front_matter(path):
    with open(path) as f: txt=f.read()
    if not txt.startswith("---"): return None
    end=txt.index("\n---",3)
    return yaml.safe_load(txt[3:end])

# 1) Cargar SOLO front-matter de los ADR (excluye README/AUTHORITY/derivados)
adrs=[]
for p in sorted(glob.glob(f"{ADR}/CN-ADR-*.md")):
    fm=load_front_matter(p)
    if fm and fm.get("document_type")=="ArchitectureDecisionRecord":
        adrs.append(fm)
assert adrs, "No se encontraron ADR con front-matter valido."

SRC=adrs[0].get("source_spec",""); SOT=adrs[0].get("source_of_truth",""); CB=adrs[0].get("constrained_by","")

# 2) INDICE MAESTRO
rows="\n".join(
 f"| {a['document_id']} | {a.get('final_id') or 'TBD'} | {a['title']} | {a['decision_kind']} | {a['status']} | {', '.join(a['impacted_entities'])} | {a['risk_level']} |"
 for a in adrs)
with open(f"{ADR}/ADR-MASTER-INDEX.md","w") as f:
    f.write(f"# Indice Maestro de ADR — SPEC-001B\n\n{DO_NOT_EDIT}"
            f"| Temp ID | Final ID | Titulo | Kind | Status | Entidades impactadas | Riesgo |\n"
            f"|---|---|---|---|---|---|---|\n{rows}\n\n"
            f"**Total:** {len(adrs)} ADR. **Origen:** {SRC}. **Constrained-by:** {CB}.\n\n"
            "## Regla de numeracion\n1. Sin offsets. 2. Final calculada contra el catalogo maestro. "
            "3. Mientras tanto rigen los IDs `CN-ADR-T001B-NN`. 4. Asignacion final unica en integracion.\n")

# 3) CATALOGO DE RELACIONES
edges=[{"from":a["document_id"],"type":r["type"],"to":r["target"]} for a in adrs for r in a.get("relations",[])]
rrows="\n".join(f"| {e['from']} | `{e['type']}` | {e['to']} |" for e in edges)
with open(f"{ADR}/ADR-RELATIONS-CATALOG.md","w") as f:
    f.write(f"# Catalogo de Relaciones entre Decisiones — SPEC-001B\n\n{DO_NOT_EDIT}"
            f"| Origen | Relacion | Destino |\n|---|---|---|\n{rrows}\n\n**Total de aristas:** {len(edges)}.\n")

# 4) DEPENDENCY GRAPH
adj={a["document_id"]:[f"{r['type']}→{r['target']}" for r in a.get("relations",[])] for a in adrs}
glist="\n".join(f"- **{k}**: " + ("; ".join(v) if v else "—") for k,v in adj.items())
with open(f"{ADR}/ADR-DEPENDENCY-GRAPH.md","w") as f:
    f.write(f"# Dependency Graph — SPEC-001B (ADR)\n\n{DO_NOT_EDIT}## Lista de adyacencia\n{glist}\n")

# 5) TRAZABILIDAD
trows="\n".join(f"| {a['document_id']} | {', '.join(a.get('source_sections',[]))} | {', '.join(a['impacted_entities'])} |" for a in adrs)
with open(f"{ADR}/TRACEABILITY-001B.md","w") as f:
    f.write(f"# Trazabilidad hacia SPEC-001B\n\n{DO_NOT_EDIT}"
            f"Source spec: {SRC}. Source of truth: {SOT}. Constrained-by: {CB}.\n\n"
            f"| ADR | Secciones de origen (SPEC-001B) | Entidades impactadas |\n|---|---|---|\n{trows}\n")

# 6) ESPEJOS JSON
json.dump([{"temp_id":a["document_id"],"final_id":a.get("final_id"),"title":a["title"],
            "kind":a["decision_kind"],"status":a["status"],"impacted_entities":a["impacted_entities"],
            "risk":a["risk_level"],"source_spec":a.get("source_spec")} for a in adrs],
          open(f"{IDX}/adr-index.json","w"),indent=2,ensure_ascii=False)
json.dump(edges,open(f"{IDX}/adr-relations.json","w"),indent=2,ensure_ascii=False)
json.dump({"nodes":[a["document_id"] for a in adrs],"adjacency":adj},
          open(f"{IDX}/adr-dependency-graph.json","w"),indent=2,ensure_ascii=False)
json.dump([{"adr":a["document_id"],"source_sections":a.get("source_sections",[]),
            "impacted_entities":a["impacted_entities"],"source_spec":a.get("source_spec"),
            "source_of_truth":a.get("source_of_truth")} for a in adrs],
          open(f"{IDX}/traceability-001b.json","w"),indent=2,ensure_ascii=False)

print(f"Regeneracion OK desde front-matter de {len(adrs)} ADR. Aristas: {len(edges)}.")
