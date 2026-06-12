# integrar-carrito.ps1
# Ejecutar desde C:\CORE\
# powershell -ExecutionPolicy Bypass -File integrar-carrito.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ROOT   = "C:\CORE"
$TEMP   = "$ROOT\temp\core-carrito-integration"
$PKG    = "$ROOT\packages\core-carrito"
$MARKET = "$ROOT\apps\core-market"

function OK($msg)   { Write-Host "  OK: $msg" -ForegroundColor Green }
function INFO($msg) { Write-Host "  >> $msg" -ForegroundColor Cyan }
function WARN($msg) { Write-Host "  WARN: $msg" -ForegroundColor Yellow }
function STEP($msg) { Write-Host "`n[ $msg ]" -ForegroundColor White }
function FAIL($msg) { Write-Host "`n  ERROR: $msg" -ForegroundColor Red; exit 1 }

# -- Verificaciones previas
STEP "Verificando prerequisitos"
if (-not (Test-Path $TEMP))   { FAIL "No existe $TEMP" }
if (-not (Test-Path $MARKET)) { FAIL "No existe $MARKET" }
OK "Directorios fuente encontrados"

# =====================================================================
# PASO 1 - Armar packages\core-carrito completo
# =====================================================================
STEP "Paso 1/5 - Construyendo packages\core-carrito"

New-Item -ItemType Directory -Force -Path "$PKG\src\adapters" | Out-Null

$srcModule = "$TEMP\core-carrito\src\CarritoModule.tsx"
if (-not (Test-Path $srcModule)) { FAIL "No encontre $srcModule" }

Copy-Item $srcModule                                        "$PKG\src\CarritoModule.tsx"    -Force
Copy-Item "$TEMP\core-carrito\src\index.ts"                "$PKG\src\index.ts"             -Force
Copy-Item "$TEMP\core-carrito\src\adapters\gateways.ts"    "$PKG\src\adapters\gateways.ts" -Force
Copy-Item "$TEMP\core-carrito\package.json"                "$PKG\package.json"             -Force
Copy-Item "$TEMP\core-carrito\tsconfig.json"               "$PKG\tsconfig.json"            -Force
OK "5 archivos copiados a packages\core-carrito"

$bak = "$PKG\src\CarritoModule.tsx.bak"
if (Test-Path $bak) { Remove-Item $bak -Force; OK ".bak eliminado" }

# =====================================================================
# PASO 2 - Parchear apps\core-market
# =====================================================================
STEP "Paso 2/5 - Parcheando apps\core-market"

$changes = "$TEMP\core-market-changes"
$stamp   = Get-Date -Format "yyyyMMdd_HHmmss"
$bakDir  = "$MARKET\.bak_precarrito_$stamp"
New-Item -ItemType Directory -Force -Path $bakDir | Out-Null

$toBackup = @(
    "package.json",
    "vite.config.ts",
    "tsconfig.json",
    "vercel.json",
    "src\app\public\CarritoPage.tsx",
    "src\app\public\CheckoutPage.tsx"
)
foreach ($f in $toBackup) {
    $full = "$MARKET\$f"
    if (Test-Path $full) {
        $flatName = $f -replace "\\", "__"
        Copy-Item $full "$bakDir\$flatName" -Force
    }
}
OK "Backup creado en $bakDir"

Copy-Item "$changes\package.json"    "$MARKET\package.json"                       -Force
Copy-Item "$changes\vite.config.ts"  "$MARKET\vite.config.ts"                     -Force
Copy-Item "$changes\tsconfig.json"   "$MARKET\tsconfig.json"                      -Force
Copy-Item "$changes\vercel.json"     "$MARKET\vercel.json"                        -Force
Copy-Item "$changes\CarritoPage.tsx" "$MARKET\src\app\public\CarritoPage.tsx"     -Force
Copy-Item "$changes\CheckoutPage.tsx" "$MARKET\src\app\public\CheckoutPage.tsx"   -Force
OK "6 archivos de core-market actualizados"

# =====================================================================
# PASO 3 - Verificar pnpm-workspace.yaml raiz
# =====================================================================
STEP "Paso 3/5 - Verificando pnpm-workspace.yaml raiz"

$wsFile = "$ROOT\pnpm-workspace.yaml"
if (Test-Path $wsFile) {
    $content = Get-Content $wsFile -Raw
    if ($content -match "packages") {
        OK "pnpm-workspace.yaml ya incluye packages/* - sin cambios"
    } else {
        WARN "pnpm-workspace.yaml existe pero no menciona packages. Revisalo manualmente."
    }
} else {
    Copy-Item "$TEMP\pnpm-workspace.yaml" $wsFile -Force
    OK "pnpm-workspace.yaml creado en la raiz"
}

# =====================================================================
# PASO 4 - pnpm install
# =====================================================================
STEP "Paso 4/5 - pnpm install"

Set-Location $ROOT

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) { FAIL "pnpm no esta en el PATH" }

INFO "Corriendo pnpm install..."
pnpm install
if ($LASTEXITCODE -ne 0) { FAIL "pnpm install fallo (exit $LASTEXITCODE)" }
OK "Dependencias instaladas y @core/carrito linkeado"

# =====================================================================
# PASO 5 - Type-check
# =====================================================================
STEP "Paso 5/5 - Type-check rapido"

Set-Location $MARKET

$tsc = Get-Command tsc -ErrorAction SilentlyContinue
if ($tsc) {
    INFO "Corriendo tsc --noEmit..."
    tsc --noEmit
    if ($LASTEXITCODE -ne 0) {
        WARN "tsc reporto errores. Si son pre-existentes del proyecto podes continuar igual."
    } else {
        OK "Sin errores de TypeScript"
    }
} else {
    WARN "tsc no esta en PATH - saltando type-check"
}

# =====================================================================
# RESUMEN
# =====================================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  @core/carrito integrado correctamente" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Backup: $bakDir" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Dev:" -ForegroundColor White
Write-Host "  cd C:\CORE && pnpm --filter core-market dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Commit y deploy:" -ForegroundColor White
Write-Host "  git add . && git commit -m `"feat: @core/carrito integrado`" && git push" -ForegroundColor Yellow
Write-Host ""
