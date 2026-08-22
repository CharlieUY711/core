<#
  close-admin-analytics.ps1

  Aplica el fix documentado en DEC-001 (.agent/DECISIONS.md):
  elimina el import muerto de AdminAnalytics en src/app/routes.tsx,
  corre agent:verify, y si el build pasa, cierra la entrada en
  .agent/CHANGELOG.md.

  Uso:
    cd C:\CORE\apps\core-market
    powershell -ExecutionPolicy Bypass -File .\close-admin-analytics.ps1

  No hace commit, no hace push, no toca git. Solo edita archivos
  en el working tree.
#>

$ErrorActionPreference = "Stop"

$repoRoot   = Get-Location
$routesPath = Join-Path $repoRoot "src\app\routes.tsx"
$changelog  = Join-Path $repoRoot ".agent\CHANGELOG.md"

Write-Host "== 1/5: Verificando archivos esperados ==" -ForegroundColor Cyan

if (-not (Test-Path $routesPath)) {
    Write-Host "ERROR: no encuentro $routesPath" -ForegroundColor Red
    Write-Host "Corre este script desde la raiz del repo (C:\CORE\apps\core-market)."
    exit 1
}
if (-not (Test-Path $changelog)) {
    Write-Host "ERROR: no encuentro $changelog" -ForegroundColor Red
    exit 1
}

Write-Host "== 2/5: Buscando la linea de import de AdminAnalytics ==" -ForegroundColor Cyan

$lines = Get-Content $routesPath
$foundMatches = $lines | Select-String -Pattern "AdminAnalytics"

if ($foundMatches.Count -eq 0) {
    Write-Host "No se encontro ninguna linea con 'AdminAnalytics' en routes.tsx." -ForegroundColor Yellow
    Write-Host "Puede que ya se haya borrado antes. No hago nada mas."
    exit 0
}

$importPattern = "^\s*import\s.*AdminAnalytics"
$importMatches = @($foundMatches | Where-Object { $_.Line -match $importPattern })
$usageMatches  = @($foundMatches | Where-Object { $_.Line -notmatch $importPattern })

if ($usageMatches.Count -gt 0) {
    Write-Host "ADVERTENCIA: encontre referencias a AdminAnalytics que NO son el import:" -ForegroundColor Red
    foreach ($m in $usageMatches) {
        Write-Host ("  Linea {0}: {1}" -f $m.LineNumber, $m.Line.Trim())
    }
    Write-Host "Esto contradice lo documentado en DEC-001 (import nunca usado)."
    Write-Host "No borro nada automaticamente - revisa esto a mano primero." -ForegroundColor Red
    exit 1
}

if ($importMatches.Count -ne 1) {
    Write-Host "ADVERTENCIA: esperaba exactamente 1 linea de import, encontre $($importMatches.Count):" -ForegroundColor Red
    foreach ($m in $importMatches) {
        Write-Host ("  Linea {0}: {1}" -f $m.LineNumber, $m.Line.Trim())
    }
    Write-Host "No borro nada automaticamente - revisa esto a mano primero." -ForegroundColor Red
    exit 1
}

$targetLine = $importMatches[0]
Write-Host ("Encontrada linea {0}: {1}" -f $targetLine.LineNumber, $targetLine.Line.Trim()) -ForegroundColor Green

Write-Host "== 3/5: Backup y borrado de la linea ==" -ForegroundColor Cyan

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$routesPath.bak-$stamp"
Copy-Item $routesPath $backupPath
Write-Host "Backup guardado en: $backupPath"

$newLines = $lines | Where-Object { $_ -ne $targetLine.Line }
Set-Content -Path $routesPath -Value $newLines -Encoding UTF8
Write-Host "Linea eliminada de routes.tsx." -ForegroundColor Green

Write-Host "== 4/5: Corriendo agent:verify ==" -ForegroundColor Cyan

$pkgManager = "npm"
if (Test-Path (Join-Path $repoRoot "pnpm-lock.yaml")) { $pkgManager = "pnpm" }
elseif (Test-Path (Join-Path $repoRoot "yarn.lock"))   { $pkgManager = "yarn" }

Write-Host "Usando package manager: $pkgManager"

$verifyOk = $true
try {
    if ($pkgManager -eq "npm") {
        & npm run agent:verify
    } elseif ($pkgManager -eq "pnpm") {
        & pnpm run agent:verify
    } else {
        & yarn agent:verify
    }
    if ($LASTEXITCODE -ne 0) {
        $verifyOk = $false
    }
} catch {
    $verifyOk = $false
}

if (-not $verifyOk) {
    Write-Host "agent:verify FALLO." -ForegroundColor Red
    Write-Host "Revirtiendo el borrado desde el backup..." -ForegroundColor Yellow
    Copy-Item $backupPath $routesPath -Force
    Write-Host "routes.tsx restaurado. No se toco el CHANGELOG." -ForegroundColor Yellow
    Write-Host "Backup queda en $backupPath por si queres revisar la diferencia."
    exit 1
}

Write-Host "agent:verify OK." -ForegroundColor Green

Write-Host "== 5/5: Cerrando la entrada en CHANGELOG.md ==" -ForegroundColor Cyan

$today = Get-Date -Format "yyyy-MM-dd"

$entryLines = @(
    ""
    "## $today - fix aplicado: import muerto de AdminAnalytics eliminado"
    ""
    "### Objetivo"
    "Aplicar el fix de una linea recomendado en DEC-001 (.agent/DECISIONS.md):"
    "borrar el import muerto de AdminAnalytics en src/app/routes.tsx."
    ""
    "### Cambios"
    "Eliminada la linea de import de AdminAnalytics desde"
    "./admin/pages/AdminAnalytics en src/app/routes.tsx. Ningun otro"
    "archivo referenciaba ese import."
    ""
    "### Archivos"
    "src/app/routes.tsx"
    ""
    "### Verificacion"
    "agent:verify corrido despues del borrado - PASS."
    ""
    "### Resultado"
    "DEC-001 cerrada. El import muerto ya no existe en el repo."
    ""
    "### Pendiente"
    "Mismas Open Questions estructurales que quedaban en CURRENT.md antes de"
    "este fix (auth-guarding de /admin y /dashboard, archivos duplicados,"
    "unica migracion SQL en el repo)."
)

Add-Content -Path $changelog -Value $entryLines -Encoding UTF8
Write-Host "CHANGELOG.md actualizado." -ForegroundColor Green

Write-Host ""
Write-Host "TODO LISTO." -ForegroundColor Cyan
Write-Host "Revisa 'git diff' antes de hacer commit. El script no hizo ningun commit ni push."
Write-Host "Backup de routes.tsx original: $backupPath"
