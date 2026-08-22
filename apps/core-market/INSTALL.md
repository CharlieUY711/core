# Installing the Agent Handoff System into CORE-Market

This package now ships with a real `package.json` that already has
`agent:status` / `agent:handoff` / `agent:verify` wired in, based on the
real `package.json` you shared (React + Vite + TypeScript + Supabase +
Tailwind v4 stack). `dev`, `build`, `preview`, and every dependency are
byte-for-byte unchanged — only the `scripts` block gained three lines.

`.agent/CURRENT.md` and `.agent/ARCHITECTURE.md` were filled in based on
what can be inferred from `package.json` alone. Anything that requires
reading actual source files (routing structure, Supabase Auth setup,
Mapbox token handling, etc.) is still marked `UNKNOWN` — that's
intentional, not an oversight.

**No lockfile was provided**, so package manager is assumed to be **npm**
in this `package.json`'s scripts and in the examples below. If the real
repo actually uses pnpm or yarn, swap the invocation (`npm run x` →
`pnpm run x` / `yarn x`) — the underlying Node scripts work identically
either way, since `agent-verify.js`/`agent-handoff.js` auto-detect the
package manager from whichever lockfile is actually present on disk.

## 1. Copy files

Copy into the repo root (`C:\CORE\apps\core-market`), preserving structure:

```text
AGENTS.md
package.json          ← replaces the existing one (only scripts changed —
                         diff yourself against your current file first if
                         you want to double-check before overwriting)
.agent/
  CURRENT.md
  HANDOFF.md
  TASK.md
  DECISIONS.md
  ARCHITECTURE.md
  CHANGELOG.md
  SESSION.md
scripts/
  agent-status.js
  agent-handoff.js
  agent-verify.js
```

If you'd rather not overwrite your `package.json` wholesale, just add
these three lines to its existing `"scripts"` block manually instead of
copying the file:

```json
"agent:status": "node scripts/agent-status.js",
"agent:handoff": "node scripts/agent-handoff.js",
"agent:verify": "node scripts/agent-verify.js"
```

## 2. Commands

```bash
npm run agent:status
npm run agent:handoff
npm run agent:verify
```

Today, `agent:verify` will only run `build` (`vite build`) — there's no
`lint`, `test`, or `typecheck` script in the project yet, so nothing else
runs. See `.agent/ARCHITECTURE.md` → "Gaps found during this pass" for
details; adding those scripts is left as a deliberate decision, not
something this installer does automatically.

## 3. Remaining bootstrap (do this once, inside the real repo)

`CURRENT.md` and `ARCHITECTURE.md` are already partially filled in from
`package.json`. What's still needed is a pass that actually reads the
source tree, since that wasn't accessible while assembling this package:

- Inspect `src/` (routes, components, Zustand stores, Supabase client init)
- Check for a `supabase/` directory (migrations, edge functions)
- Confirm Mapbox token handling and Supabase env var usage
- Resolve the "Open Questions" section of `.agent/CURRENT.md`

Then run `agent:status` and `agent:verify` for real to confirm they behave
as expected against the actual repo.

`agent-verify.js` only runs scripts that already exist in `package.json`
under common names (`typecheck`/`type-check`/`tsc`, `lint`, `test`/
`test:ci`, `build`). If none exist, it says so and does nothing — it never
invents a command.

`agent-handoff.js` reads real git state (branch, last commit, modified/
added/deleted files) and updates SESSION.md / CURRENT.md / CHANGELOG.md /
HANDOFF.md automatically for the factual parts, and leaves
`REQUIRES AGENT INPUT` for anything interpretive (objective, what worked,
what's broken) — the closing agent must fill those in before the session
is considered done, per AGENTS.md section 5.

## What this does NOT do

- Does not commit, push, or switch git branches.
- Does not modify any file outside `AGENTS.md`, `.agent/*`, `scripts/agent-*.js`,
  and the `scripts` block of `package.json`.
- Does not run destructive commands or auto-fix code.
