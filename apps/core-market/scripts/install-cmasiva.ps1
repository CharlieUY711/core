# ============================================================
#  CORE Market - Carga Masiva : instalar + deploy + commit
#  Uso:  powershell -ExecutionPolicy Bypass -File install-cmasiva.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# --- Rutas ---
$Src  = "C:\CORE\temp\CMasiva_2"
$Repo = "C:\CORE\apps\core-market"

function Info($m){ Write-Host "`n$m" -ForegroundColor Cyan }
function Ok($m){   Write-Host "   [ok] $m" -ForegroundColor Green }
function Warn($m){ Write-Host "   [!]  $m" -ForegroundColor Yellow }

if (-not (Test-Path $Src))  { throw "No existe la carpeta de origen: $Src" }
if (-not (Test-Path $Repo)) { throw "No existe el repo: $Repo" }

# --- Mapa origen -> destino (relativo al repo) ---
$map = @(
  @{ from = "AdminCargaMasiva.tsx";     to = "src\app\admin\pages\AdminCargaMasiva.tsx" },
  @{ from = "cargaMasivaClient.ts";     to = "src\api\cargaMasivaClient.ts" },
  @{ from = "AdminLayout.tsx";          to = "src\app\admin\components\AdminLayout.tsx" },
  @{ from = "import-proxy.index.ts";    to = "supabase\functions\import-proxy\index.ts" },
  @{ from = "extract-catalog.index.ts"; to = "supabase\functions\extract-catalog\index.ts" }
)

# ── 1) Copiar archivos ───────────────────────────────────────
Info "1) Copiando archivos a sus destinos..."
foreach ($m in $map) {
  $f = Join-Path $Src $m.from
  if (Test-Path $f) {
    $dest    = Join-Path $Repo $m.to
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir | Out-Null }
    Copy-Item $f $dest -Force
    Ok "$($m.from)  ->  $($m.to)"
  } else {
    Warn "no esta en la carpeta (se omite): $($m.from)"
  }
}

# ── 2) Limpiar archivos muertos (route handlers Next + cliente duplicado) ──
Info "2) Eliminando archivos muertos..."
Set-Location $Repo
$dead = @(
  "src/app/api/cargamasiva/url/route.ts",
  "src/app/api/cargamasiva/csv/route.ts",
  "src/app/api/cargamasiva/pdf/route.ts",
  "src/app/api/cargaMasivaClient.ts"
)
foreach ($d in $dead) {
  git rm --ignore-unmatch $d 2>$null | Out-Null
  $full = Join-Path $Repo ($d -replace '/','\')
  if (Test-Path $full) { Remove-Item $full -Force }
}
Ok "limpieza hecha"

# ── 3) Supabase: secrets + deploy ───────────────────────────
Info "3) Supabase Edge Functions..."
$hasSupabase = $null -ne (Get-Command supabase -ErrorAction SilentlyContinue)
if ($hasSupabase) {
  $key = Read-Host "   Pega tu ANTHROPIC_API_KEY (Enter para omitir)"
  if ($key) {
    supabase secrets set ANTHROPIC_API_KEY="$key"
    supabase secrets set EXTRACT_MODEL="claude-sonnet-4-6"
    Ok "secrets seteados"
  } else {
    Warn "secret omitido - la extraccion IA dara 'Falta ANTHROPIC_API_KEY' hasta que lo setees"
  }

  Info "   Deployando funciones..."
  supabase functions deploy import-proxy
  if ($LASTEXITCODE -eq 0) { Ok "import-proxy deployada" } else { Warn "fallo deploy import-proxy (revisa 'supabase link')" }
  supabase functions deploy extract-catalog
  if ($LASTEXITCODE -eq 0) { Ok "extract-catalog deployada" } else { Warn "fallo deploy extract-catalog" }
} else {
  Warn "Supabase CLI no encontrado. Deploy manual:"
  Warn "   supabase functions deploy import-proxy"
  Warn "   supabase functions deploy extract-catalog"
  Warn "   supabase secrets set ANTHROPIC_API_KEY=...   (y EXTRACT_MODEL opcional)"
}

# ── 4) Git: stage + commit ──────────────────────────────────
Info "4) Git commit..."
git add src/app/admin/pages/AdminCargaMasiva.tsx
git add src/api/cargaMasivaClient.ts
git add supabase/functions/import-proxy/index.ts
git add supabase/functions/extract-catalog/index.ts
if (Test-Path (Join-Path $Src "AdminLayout.tsx")) {
  git add src/app/admin/components/AdminLayout.tsx
}

git commit -m "feat(carga-masiva): proxy URL + extraccion IA (Edge Functions) y mapeo con tokens CORE"
if ($LASTEXITCODE -eq 0) { Ok "commit hecho" } else { Warn "nada para commitear (o ya estaba commiteado)" }

# ── 5) Push (con confirmacion) ──────────────────────────────
$push = Read-Host "`n   Pushear ahora? (s/N)"
if ($push -match '^[sS]$') {
  git push
  if ($LASTEXITCODE -eq 0) { Ok "push hecho" } else { Warn "fallo el push" }
} else {
  Warn "push omitido - corre 'git push' cuando quieras"
}

Info "Listo. Antes de pushear (si no lo hiciste), probalo local con:  pnpm dev"
Write-Host ""
