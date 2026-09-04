#!/usr/bin/env node
// core-market-inspect.mjs — Inspección SOLO LECTURA, enfocada en
// carrito/checkout/ordenes, paquetes @core/*, y PWA/Instagram.
// Uso:  node core-market-inspect.mjs          (desde C:\CORE)
// No modifica nada. Guarda el reporte en core-market-report.txt.
// De .env.local imprime SOLO los nombres de variables, nunca valores.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(process.argv[2] || process.cwd());
const IGNORE = new Set(["node_modules", ".next", ".git", "dist", "build", ".turbo", "coverage", ".vercel"]);
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".sql", ".json", ".css", ".html"]);

const out = [];
const log = (s = "") => { out.push(s); console.log(s); };
const h = (s) => log("\n" + "=".repeat(70) + "\n" + s + "\n" + "=".repeat(70));

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
const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");

h("CORE-MARKET — REPORTE DE CARRITO/CHECKOUT/PWA (solo lectura)");
log("Raíz monorepo: " + ROOT);

// Recolectar TODO el monorepo (excepto lo ignorado), porque los
// paquetes @core/* pueden vivir fuera de apps/core-market.
const allFiles = [...walk(ROOT)];
log("Archivos totales escaneados: " + allFiles.length);

// 1) apps/ y packages/ — qué hay
h("1) ESTRUCTURA: apps/ y packages/");
for (const dir of ["apps", "packages"]) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) { log(dir + "/  (no existe)"); continue; }
  const items = fs.readdirSync(full, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  log(dir + "/ (" + items.length + "): " + items.join(", "));
}

// 2) Todos los imports "@core/xxx" en el monorepo, y si ese paquete existe de verdad
h("2) IMPORTS @core/* Y SI EXISTEN DE VERDAD");
const IMPORT_RE = /from\s+["']@core\/([a-zA-Z0-9_-]+)["']/g;
const importsByPkg = {};
for (const f of allFiles) {
  const t = readText(f); if (!t) continue;
  let m;
  while ((m = IMPORT_RE.exec(t))) {
    const pkg = m[1];
    (importsByPkg[pkg] ||= []).push(rel(f));
  }
}
const pkgsDir = path.join(ROOT, "packages");
const realPkgs = fs.existsSync(pkgsDir)
  ? fs.readdirSync(pkgsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
  : [];
if (!Object.keys(importsByPkg).length) log("No se encontraron imports @core/*.");
for (const pkg of Object.keys(importsByPkg).sort()) {
  const exists = realPkgs.includes(pkg);
  log(`  @core/${pkg}  →  ${exists ? "✅ existe en packages/" : "❌ NO existe en packages/"} (importado en ${importsByPkg[pkg].length} archivo(s))`);
  importsByPkg[pkg].forEach(f => log("      " + f));
}

// 3) Archivos de carrito/checkout/ordenes en todo el monorepo
h("3) ARCHIVOS DE CARRITO / CHECKOUT / ORDENES");
const CART_PATTERN = /(carrito|checkout|orden(es)?|commerce)/i;
const cartFiles = allFiles.filter(f => CART_PATTERN.test(rel(f)) && !rel(f).includes("node_modules"));
if (!cartFiles.length) log("Ninguno encontrado.");
else cartFiles.forEach(f => log("  " + rel(f)));

// 4) Dentro de esos archivos: mutaciones Supabase y tablas referenciadas
h("4) MUTACIONES Y TABLAS EN ARCHIVOS DE CARRITO/CHECKOUT");
const MUT = /\.(insert|update|upsert|delete)\s*\(/g;
const FROM = /\.from\(\s*['"`]([A-Za-z0-9_]+)['"`]/g;
const tableHits = {};
for (const f of cartFiles) {
  const t = readText(f); if (!t) continue;
  const m = t.match(MUT);
  if (m && m.length) log(`  ${String(m.length).padStart(3)}×  mutación en ${rel(f)}`);
  let fm; while ((fm = FROM.exec(t))) tableHits[fm[1]] = (tableHits[fm[1]] || 0) + 1;
}
log("\nTablas referenciadas (.from(...)):");
Object.keys(tableHits).sort().forEach(k => log(`  ${String(tableHits[k]).padStart(3)}×  ${k}`));

// 5) PWA / Instagram
h("5) PWA E INTEGRACIÓN CON INSTAGRAM");
const manifestFiles = allFiles.filter(f => /manifest\.json$/i.test(f) && !rel(f).includes("node_modules"));
const swFiles = allFiles.filter(f => /(sw|service-worker)\.(js|ts)$/i.test(path.basename(f)) && !rel(f).includes("node_modules"));
log("manifest.json encontrados: " + manifestFiles.length);
manifestFiles.forEach(f => log("  " + rel(f)));
log("Service workers encontrados: " + swFiles.length);
swFiles.forEach(f => log("  " + rel(f)));

let iabDetection = [];
for (const f of allFiles) {
  const t = readText(f); if (!t) continue;
  if (/Instagram\|FBAN\|FBAV|navigator\.userAgent.*Instagram/i.test(t)) iabDetection.push(rel(f));
}
log("Detección de navegador in-app de Instagram: " + (iabDetection.length ? iabDetection.join(", ") : "no encontrada"));

// 6) Migraciones Supabase relacionadas a ordenes/carrito
h("6) MIGRACIONES SUPABASE (ordenes/carrito)");
const migDirs = [path.join(ROOT, "supabase", "migrations")];
for (const d of migDirs) {
  if (fs.existsSync(d)) {
    const ms = fs.readdirSync(d).filter(x => x.endsWith(".sql"));
    const relevant = ms.filter(m => /orden|carrito|comprador/i.test(m));
    log(d + " — " + ms.length + " migraciones totales, " + relevant.length + " relacionadas a ordenes/carrito:");
    relevant.forEach(m => log("  " + m));
  } else {
    log(d + " no existe.");
  }
}

// 7) Git
h("7) GIT");
function git(cmd) { try { return execSync("git " + cmd, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return null; } }
const branch = git("rev-parse --abbrev-ref HEAD");
if (branch === null) log("git no disponible o no es repo.");
else {
  log("branch: " + branch);
  const status = git("status --porcelain") || "";
  const changed = status ? status.split("\n").filter(Boolean) : [];
  log("archivos sin commitear: " + changed.length);
  changed.filter(c => CART_PATTERN.test(c)).forEach(c => log("  (carrito/checkout) " + c));
  changed.filter(c => !CART_PATTERN.test(c)).slice(0, 15).forEach(c => log("  (otro) " + c));
}

const reportPath = path.join(process.cwd(), "core-market-report.txt");
try { fs.writeFileSync(reportPath, out.join("\n"), "utf8"); console.log("\n→ Reporte guardado en " + reportPath); } catch {}
