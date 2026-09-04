#!/usr/bin/env node
// inspect-repo.mjs — Inspección SOLO LECTURA del repo core-bep.
// Uso:  node inspect-repo.mjs            (desde la raíz del monorepo C:\CORE)
//       node inspect-repo.mjs C:\CORE    (pasando la raíz explícita)
// No modifica nada. Imprime un reporte y lo guarda en bep-repo-report.txt.
// De .env.local imprime SOLO los nombres de variables, nunca los valores.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(process.argv[2] || process.cwd());
const IGNORE = new Set(["node_modules", ".next", ".git", "dist", "build", ".turbo", "coverage"]);
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".sql", ".json", ".css"]);

const out = [];
const log = (s = "") => { out.push(s); console.log(s); };
const h = (s) => log("\n" + "=".repeat(70) + "\n" + s + "\n" + "=".repeat(70));

// Resolver el directorio de la app
function pickApp() {
  const candidates = [path.join(ROOT, "apps", "core-bep"), ROOT];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "src")) || fs.existsSync(path.join(c, "package.json"))) return c;
  }
  return ROOT;
}
const APP = pickApp();

function* walk(dir) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function readText(f) {
  if (!TEXT_EXT.has(path.extname(f))) return null;
  try { return fs.readFileSync(f, "utf8"); } catch { return null; }
}

const rel = (f) => path.relative(APP, f).split(path.sep).join("/");

// Recolectar archivos de la app
const srcDir = fs.existsSync(path.join(APP, "src")) ? path.join(APP, "src") : APP;
const files = [...walk(srcDir)];

h("CORE NEXUS / BEP — REPORTE DE REPO (solo lectura)");
log("Raíz monorepo : " + ROOT);
log("App detectada : " + APP);
log("Archivos (src): " + files.length);

// 1) Mutaciones Supabase por archivo (heurística: .insert/.update/.upsert/.delete)
h("1) MUTACIONES (¿hay CRUD de escritura?)  [heurística]");
const MUT = /\.(insert|update|upsert|delete)\s*\(/g;
const mutByFile = [];
for (const f of files) {
  const t = readText(f); if (!t) continue;
  const m = t.match(MUT);
  if (m && m.length) mutByFile.push([rel(f), m.length]);
}
if (!mutByFile.length) log("Sin llamadas de mutación detectadas (todo lectura).");
else { log("Archivos con mutaciones:"); mutByFile.sort((a,b)=>b[1]-a[1]).forEach(([f,n]) => log(`  ${String(n).padStart(3)}×  ${f}`)); }

// 2) CRUD por módulo
h("2) ESTADO POR MÓDULO");
const MODULES = ["bom","documents","compliance","rfq","risks","queries","knowledge","profile","projects"];
for (const mod of MODULES) {
  const modFiles = files.filter(f => rel(f).includes(`/${mod}/`) || rel(f).endsWith(`/${mod}/page.tsx`) || rel(f).includes(`/${mod}`));
  if (!modFiles.length) { log(`  ${mod.padEnd(11)}: (no encontrado)`); continue; }
  let writes = 0, hasPage = false, hasForm = false;
  for (const f of modFiles) {
    const r = rel(f); const t = readText(f) || "";
    if (r.endsWith("page.tsx") || r.endsWith("page.ts")) hasPage = true;
    if (/form|modal|drawer/i.test(r)) hasForm = true;
    const m = t.match(MUT); if (m) writes += m.length;
  }
  log(`  ${mod.padEnd(11)}: page=${hasPage?"sí":"no"}  form/modal=${hasForm?"sí":"no"}  mutaciones=${writes}  archivos=${modFiles.length}`);
}

// 3) Server Actions y API routes (¿se respeta el patrón client-side de 001A Fase 1?)
h("3) SERVER ACTIONS / API ROUTES");
const serverActions = files.filter(f => { const t = readText(f); return t && /["']use server["']/.test(t); });
const apiRoutes = files.filter(f => /\/route\.(ts|js)$/.test(rel(f)) && rel(f).includes("/app/"));
log(`"use server"   : ${serverActions.length} archivo(s)` + (serverActions.length ? "\n  " + serverActions.map(rel).join("\n  ") : ""));
log(`API routes     : ${apiRoutes.length} archivo(s)` + (apiRoutes.length ? "\n  " + apiRoutes.map(rel).join("\n  ") : ""));

// 4) Tablas que toca el código (.from('tabla'))
h("4) TABLAS REFERENCIADAS EN CÓDIGO (.from(...))");
const FROM = /\.from\(\s*['"`]([A-Za-z0-9_]+)['"`]/g;
const tableHits = {};
for (const f of files) {
  const t = readText(f); if (!t) continue;
  let m; while ((m = FROM.exec(t))) tableHits[m[1]] = (tableHits[m[1]] || 0) + 1;
}
const tk = Object.keys(tableHits).sort();
if (!tk.length) log("Ninguna detectada.");
else tk.forEach(k => log(`  ${String(tableHits[k]).padStart(3)}×  ${k}`));

// 5) package.json
h("5) PACKAGE.JSON");
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(APP, "package.json"), "utf8"));
  log("name    : " + (pkg.name || "?"));
  const deps = { ...(pkg.dependencies||{}), ...(pkg.devDependencies||{}) };
  const want = ["next","react","@supabase/supabase-js","@supabase/ssr","typescript","tailwindcss"];
  want.forEach(d => { if (deps[d]) log(`  ${d.padEnd(28)} ${deps[d]}`); });
} catch { log("No se pudo leer package.json en " + APP); }

// 6) Migraciones Supabase
h("6) MIGRACIONES SUPABASE");
const migDirs = [path.join(ROOT,"supabase","migrations"), path.join(APP,"supabase","migrations")];
let foundMig = false;
for (const d of migDirs) {
  if (fs.existsSync(d)) {
    foundMig = true;
    const ms = fs.readdirSync(d).filter(x => x.endsWith(".sql")).sort();
    log(d + "  (" + ms.length + " migraciones)");
    ms.slice(-15).forEach(m => log("  " + m));
  }
}
if (!foundMig) log("No hay carpeta supabase/migrations (¿esquema gestionado manualmente?).");

// 7) Git
h("7) GIT");
function git(cmd) { try { return execSync("git " + cmd, { cwd: ROOT, stdio:["ignore","pipe","ignore"] }).toString().trim(); } catch { return null; } }
const branch = git("rev-parse --abbrev-ref HEAD");
if (branch === null) log("git no disponible o no es repo.");
else {
  log("branch       : " + branch);
  log("últimos commits:\n  " + (git("log --oneline -10") || "").split("\n").join("\n  "));
  const status = git("status --porcelain") || "";
  const changed = status ? status.split("\n").filter(Boolean) : [];
  log("sin commitear: " + changed.length + " archivo(s)");
  changed.slice(0,25).forEach(c => log("  " + c));
}

// 8) .env.local — SOLO nombres de variables
h("8) .ENV.LOCAL (solo nombres de variables, sin valores)");
const envPath = path.join(APP, ".env.local");
if (fs.existsSync(envPath)) {
  const keys = fs.readFileSync(envPath,"utf8").split("\n")
    .map(l => l.trim()).filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => l.split("=")[0].trim());
  keys.forEach(k => log("  " + k));
} else log("No existe " + envPath);

// Guardar reporte
const reportPath = path.join(process.cwd(), "bep-repo-report.txt");
try { fs.writeFileSync(reportPath, out.join("\n"), "utf8"); console.log("\n→ Reporte guardado en " + reportPath); } catch {}
