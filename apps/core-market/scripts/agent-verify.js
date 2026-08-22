#!/usr/bin/env node
/**
 * agent:verify
 *
 * Detects which verification scripts actually exist in package.json
 * (typecheck / lint / test / build, under common name variants) and runs
 * them. Does NOT invent commands, does NOT run destructive commands, does
 * NOT modify code to fix errors. Results are appended to .agent/SESSION.md.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const PKG_PATH = path.join(ROOT, "package.json");
const SESSION_PATH = path.join(ROOT, ".agent", "SESSION.md");

const CANDIDATES = {
  typecheck: ["typecheck", "type-check", "tsc"],
  lint: ["lint"],
  test: ["test", "test:ci"],
  build: ["build"],
};

function detectPackageManager() {
  if (fs.existsSync(path.join(ROOT, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(ROOT, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(ROOT, "package-lock.json"))) return "npm";
  return "npm"; // default fallback, not an assumption about the project
}

function runScript(pm, scriptName) {
  const args =
    pm === "yarn" ? [scriptName] : pm === "pnpm" ? ["run", scriptName] : ["run", scriptName];
  const cmd = process.platform === "win32" ? `${pm}.cmd` : pm;
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", shell: true });
  return {
    ok: result.status === 0,
    status: result.status,
    stdout: (result.stdout || "").slice(-4000),
    stderr: (result.stderr || "").slice(-4000),
  };
}

function updateSession(resultsSummary) {
  if (!fs.existsSync(SESSION_PATH)) return;
  let content = fs.readFileSync(SESSION_PATH, "utf8");

  const testsBlock = resultsSummary.length
    ? resultsSummary.map((r) => `- ${r.name}: ${r.ok ? "PASS" : "FAIL"}`).join("\n")
    : "No verification scripts found in package.json (typecheck/lint/test/build).";

  const errorsBlock = resultsSummary
    .filter((r) => !r.ok)
    .map((r) => `### ${r.name}\n\`\`\`\n${r.stderr || r.stdout}\n\`\`\``)
    .join("\n\n") || "None";

  content = content.replace(
    /## Tests\n[\s\S]*?(?=\n## Errors)/,
    `## Tests\n${testsBlock}\n`
  );
  content = content.replace(
    /## Errors\n[\s\S]*?(?=\n## Decisions)/,
    `## Errors\n${errorsBlock}\n`
  );

  fs.writeFileSync(SESSION_PATH, content, "utf8");
}

function main() {
  if (!fs.existsSync(PKG_PATH)) {
    console.error("agent:verify — package.json not found at repo root.");
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, "utf8"));
  const scripts = pkg.scripts || {};
  const pm = detectPackageManager();

  const toRun = [];
  for (const [kind, names] of Object.entries(CANDIDATES)) {
    const found = names.find((n) => scripts[n]);
    if (found) toRun.push({ kind, name: found });
  }

  if (!toRun.length) {
    console.log(
      "agent:verify — no typecheck/lint/test/build scripts found in package.json.\n" +
        "Nothing to run. Add scripts to package.json if verification is needed."
    );
    updateSession([]);
    return;
  }

  console.log(`agent:verify — using package manager: ${pm}\n`);
  const results = [];

  for (const { kind, name } of toRun) {
    console.log(`Running ${kind} (${pm} run ${name}) ...`);
    const r = runScript(pm, name);
    results.push({ name: `${kind} (${name})`, ...r });
    console.log(r.ok ? `  PASS` : `  FAIL (exit ${r.status})`);
  }

  console.log("\nSummary:");
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"} — ${r.name}`);
  }

  updateSession(results);
  console.log("\nResults recorded in .agent/SESSION.md");

  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main();
