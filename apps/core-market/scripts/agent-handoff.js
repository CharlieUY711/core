#!/usr/bin/env node
/**
 * agent:handoff
 *
 * Closes an agent session:
 *  - reads real git status (modified/new/deleted files, branch, last commit)
 *  - updates .agent/SESSION.md (Files Changed, Handoff Generated)
 *  - updates .agent/CURRENT.md (Files Recently Modified, Last Updated)
 *  - appends a skeleton entry to .agent/CHANGELOG.md
 *  - regenerates .agent/HANDOFF.md
 *
 * Never commits, pushes, or switches branches. Never invents interpretive
 * content (objective, what worked, what didn't) — those fields are left as
 * "REQUIRES AGENT INPUT" for the agent/human to fill in before ending the
 * session, per AGENTS.md.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const AGENT_DIR = path.join(ROOT, ".agent");
const CURRENT_PATH = path.join(AGENT_DIR, "CURRENT.md");
const SESSION_PATH = path.join(AGENT_DIR, "SESSION.md");
const CHANGELOG_PATH = path.join(AGENT_DIR, "CHANGELOG.md");
const HANDOFF_PATH = path.join(AGENT_DIR, "HANDOFF.md");

function git(args) {
  const cmd = process.platform === "win32" ? "git.exe" : "git";
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) return null;
  return (result.stdout || "").trim();
}

function getGitState() {
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]) || "REQUIRES AGENT INPUT";
  const lastCommit = git(["log", "-1", "--pretty=%h %s"]) || "REQUIRES AGENT INPUT";
  const statusPorcelain = git(["status", "--porcelain"]);

  const modified = [];
  const added = [];
  const deleted = [];

  if (statusPorcelain) {
    for (const line of statusPorcelain.split("\n")) {
      if (!line.trim()) continue;
      const m = /^(..?) +(.+)$/.exec(line); if (!m) continue;
      const code = m[1], file = m[2];
      if (code.includes("D")) deleted.push(file);
      else if (code.includes("A") || code.includes("?")) added.push(file);
      else if (code.includes("M")) modified.push(file);
    }
  }

  return { branch, lastCommit, modified, added, deleted, hasGit: statusPorcelain !== null };
}

function formatList(list) {
  return list.length ? list.map((f) => `- ${f}`).join("\n") : "None";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function updateSession(gitState) {
  if (!fs.existsSync(SESSION_PATH)) return;
  let content = fs.readFileSync(SESSION_PATH, "utf8");

  const filesChanged = [
    "### Modified", formatList(gitState.modified),
    "### Added", formatList(gitState.added),
    "### Deleted", formatList(gitState.deleted),
  ].join("\n");

  content = content.replace(
    /## Files Changed\n[\s\S]*?(?=\n## Tests)/,
    `## Files Changed\n${filesChanged}\n`
  );
  content = content.replace(
    /## Handoff Generated\n[\s\S]*/,
    `## Handoff Generated\nYES\n`
  );

  fs.writeFileSync(SESSION_PATH, content, "utf8");
}

function updateCurrent(gitState) {
  if (!fs.existsSync(CURRENT_PATH)) return;
  let content = fs.readFileSync(CURRENT_PATH, "utf8");

  const allFiles = [...gitState.modified, ...gitState.added, ...gitState.deleted];
  const filesBlock = allFiles.length ? formatList(allFiles) : "None (no working-tree changes)";

  content = content.replace(
    /## Files Recently Modified\n[\s\S]*?(?=\n## Known Problems)/,
    `## Files Recently Modified\n${filesBlock}\n`
  );
  content = content.replace(
    /## Last Updated\n[\s\S]*/,
    `## Last Updated\n${todayISO()}\n`
  );

  fs.writeFileSync(CURRENT_PATH, content, "utf8");
}

function appendChangelog(gitState) {
  if (!fs.existsSync(CHANGELOG_PATH)) return;
  const allFiles = [...gitState.modified, ...gitState.added, ...gitState.deleted];
  const entry = `\n## ${todayISO()} — REQUIRES AGENT INPUT (agent name)

### Objective
REQUIRES AGENT INPUT

### Changes
REQUIRES AGENT INPUT

### Files
${allFiles.length ? allFiles.join(", ") : "None"}

### Verification
REQUIRES AGENT INPUT — see .agent/SESSION.md (run agent:verify)

### Result
REQUIRES AGENT INPUT

### Remaining
REQUIRES AGENT INPUT
`;
  fs.appendFileSync(CHANGELOG_PATH, entry, "utf8");
}

function regenerateHandoff(gitState) {
  const allFiles = [...gitState.modified, ...gitState.added, ...gitState.deleted];
  const content = `You are continuing work on CORE-Market.

Read AGENTS.md first.

Then read:
.agent/CURRENT.md
.agent/TASK.md
.agent/DECISIONS.md
.agent/ARCHITECTURE.md
.agent/HANDOFF.md (this file)

---

# CORE-Market — Agent Handoff

## CONTEXT
REQUIRES AGENT INPUT

## CURRENT STATE
See .agent/CURRENT.md (last updated ${todayISO()}).

## WORK COMPLETED
REQUIRES AGENT INPUT

## CURRENT PROBLEM
REQUIRES AGENT INPUT

## OBJECTIVE FOR NEXT AGENT
REQUIRES AGENT INPUT

## FILES TO INSPECT
REQUIRES AGENT INPUT

## FILES MODIFIED BY PREVIOUS AGENT
Branch: ${gitState.branch}
Last commit: ${gitState.lastCommit}

${allFiles.length ? formatList(allFiles) : "None (no working-tree changes at handoff time)"}

## CONSTRAINTS
Do not change framework, database, Supabase config, Next.js setup, design
system, branding, APIs, or business logic. See AGENTS.md.

## DO NOT CHANGE
Anything outside: AGENTS.md, .agent/*, scripts/agent-*.js, and the
\`scripts\` block of package.json.

## VERIFICATION REQUIRED
REQUIRES AGENT INPUT — run agent:verify and record results in SESSION.md
if not already done.

## EXPECTED RESULT
REQUIRES AGENT INPUT

## INSTRUCTIONS FOR NEXT AGENT
REQUIRES AGENT INPUT
`;
  fs.writeFileSync(HANDOFF_PATH, content, "utf8");
}

function main() {
  if (!fs.existsSync(AGENT_DIR)) {
    console.error("agent:handoff — .agent/ directory not found at repo root.");
    process.exit(1);
  }

  const gitState = getGitState();

  console.log("agent:handoff — session close\n");
  console.log(`Branch: ${gitState.branch}`);
  console.log(`Last commit: ${gitState.lastCommit}`);
  if (!gitState.hasGit) {
    console.log("Git status unavailable (not a git repo, or git not found).");
  } else {
    console.log(`Modified files: ${gitState.modified.length}`);
    console.log(`New files: ${gitState.added.length}`);
    console.log(`Deleted files: ${gitState.deleted.length}`);
  }

  updateSession(gitState);
  updateCurrent(gitState);
  appendChangelog(gitState);
  regenerateHandoff(gitState);

  console.log(
    "\nUpdated: .agent/SESSION.md, .agent/CURRENT.md, .agent/CHANGELOG.md, .agent/HANDOFF.md"
  );
  console.log(
    "Fields marked REQUIRES AGENT INPUT need to be filled in by the agent " +
      "before the session is truly closed — this script does not infer intent."
  );
  console.log("\nNo commit, push, or branch change was performed.");
}

main();
