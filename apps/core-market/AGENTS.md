# AGENTS.md — CORE-Market Agent Operating Protocol

This file is the entry point for any AI agent (Claude Code, Codex, Gemini CLI,
or any other agent capable of reading Markdown files in this repository)
working on **CORE-Market**.

This is an **operational layer only**. It does not change, replace, or imply
any change to the existing architecture, framework, database, design system,
APIs, or business logic of CORE-Market. If anything in this file appears to
conflict with the real state of the project, the real project wins — update
this layer, not the other way around.

---

## 0. WHY THIS EXISTS

Multiple agents work on this repository sequentially, in separate sessions,
often with no shared memory. Without a handoff system, every agent re-reads
the whole repo, re-derives the architecture, and re-litigates decisions
already made. This wastes tokens and produces inconsistent work.

This system exists so an agent can:

1. read the current state quickly (not re-audit the whole repo);
2. understand what the previous agent was doing;
3. work only within the necessary scope;
4. record its changes;
5. leave a precise handoff for the next agent.

---

## 1. START PROTOCOL (MANDATORY)

Before touching any code, read, in this order:

```text
AGENTS.md
.agent/CURRENT.md
.agent/HANDOFF.md
.agent/DECISIONS.md
.agent/ARCHITECTURE.md
.agent/TASK.md
```

If any of these files does not exist yet, or is incomplete, reconstruct it
using information actually found in the repository. Never invent content —
if something can't be determined, write `UNKNOWN` (in CURRENT.md) or
`REQUIRES AGENT INPUT` (in HANDOFF.md / SESSION.md).

**Do not read the entire repository automatically.** Use the context files
above to figure out which specific part of the project you actually need to
inspect for the current task. Only expand scope when you hit a real,
concrete dependency you can't resolve without more context.

---

## 2. CONTINUITY PROTOCOL

### When an agent starts

```text
READ:
AGENTS.md
.agent/CURRENT.md
.agent/HANDOFF.md
.agent/TASK.md
.agent/DECISIONS.md
.agent/ARCHITECTURE.md
```

### Then identify

```text
1. current objective
2. current state
3. relevant files
4. constraints
5. unresolved problem
```

### Then inspect only

```text
the files required for the current objective.
```

### Then

```text
IMPLEMENT
VERIFY
DOCUMENT
HANDOFF
```

---

## 3. TOKEN ECONOMY RULE (CRITICAL)

An agent must NOT:

- read the whole repository without a specific need;
- repeat analysis that is already documented;
- reconstruct architecture that is already described in ARCHITECTURE.md;
- re-investigate decisions already recorded in DECISIONS.md;
- review files unrelated to the current task;
- redo work the previous agent already completed and documented.

Context expansion order:

```text
HANDOFF.md
   ↓
CURRENT.md
   ↓
TASK.md
   ↓
Relevant section of ARCHITECTURE.md
   ↓
Relevant files (and only those)
   ↓
Implementation
```

---

## 4. DECISIONS ARE STICKY

An existing entry in `.agent/DECISIONS.md` must not be changed just because
a new agent would have preferred a different approach. To change a decision:

1. identify the existing decision (DEC-XXX);
2. explain why it needs to change;
3. create a **new** decision entry;
4. mark the old one's status as `SUPERSEDED` (pointing to the new one).

---

## 5. FINALIZATION CHECKLIST (MANDATORY BEFORE ENDING A SESSION)

```text
[ ] Task completed, or its exact status documented
[ ] Relevant tests/typecheck/lint/build executed (via agent:verify)
[ ] Git status inspected
[ ] .agent/CURRENT.md updated
[ ] .agent/SESSION.md updated
[ ] .agent/CHANGELOG.md updated
[ ] .agent/DECISIONS.md updated if a decision was made or changed
[ ] .agent/HANDOFF.md generated / updated
```

If the task is not finished: **do not hide the problem.** HANDOFF.md must
state plainly what works, what doesn't, what was tried, where it's stuck,
and what the next agent should do.

---

## 6. AUTOMATION

Three commands are available (wire them into `package.json` per your
project's package manager — see `INSTALL.md` in this package):

```bash
<pkg-manager> run agent:status    # prints .agent/CURRENT.md as a summary
<pkg-manager> run agent:handoff   # closes a session: git status, updates
                                   # SESSION.md / CURRENT.md / CHANGELOG.md,
                                   # regenerates HANDOFF.md
<pkg-manager> run agent:verify    # runs whatever typecheck/lint/test/build
                                   # scripts actually exist in package.json
```

None of these commands commit, push, change branches, or auto-fix code.
Git stays entirely under the agent's/human's control. Where a command can't
determine something automatically, it writes `REQUIRES AGENT INPUT` instead
of guessing.

---

## 7. WHAT THIS LAYER MAY TOUCH

```text
AGENTS.md
.agent/*
scripts/agent-*.js
package.json   (only to register the three "agent:*" scripts)
```

Nothing else. No component, schema, API, UI, or business-logic file is to
be modified as part of installing or operating this system.

## Números — regla inamovible

**Todo valor numérico va alineado a la derecha.** Sin excepciones: precios,
stock, porcentajes, tasas, métricas, cantidades.

Un número se lee de atrás para adelante —unidades, decenas, centenas—. A la
izquierda, las unidades caen en un lugar distinto según cuántos dígitos tenga
cada uno, y una columna de importes deja de poder compararse de un vistazo.

Va siempre con `tabular-nums`: sin él los dígitos tienen anchos distintos, el
número se corre mientras se escribe y las columnas no alinean aunque estén a la
derecha.

```tsx
import { NUMERICO, NUMERICO_SELECT } from "@/app/admin/ui/numeros";

<input type="number" style={{ ...inp, ...NUMERICO }} />
<td style={{ ...td, ...NUMERICO }}>{precio}</td>
<select style={{ ...inp, ...NUMERICO_SELECT }}>   {/* deja lugar a la flecha */}
```

No es una convención: `scripts/check-numeros.mjs` corre en `pnpm run
agent:verify` y **falla** si aparece un `<input type="number">` que no use
`NUMERICO`. Una excepción se marca con `// numeros-ok: <motivo>` en la línea de
arriba — el motivo es obligatorio, porque una excepción sin razón es la regla
rota.

El chequeo cubre inputs, no textos: un número dentro de un `<td>` o un `<div>`
no se distingue de una palabra sin entender el código. Esos siguen siendo
responsabilidad de quien los escribe.
