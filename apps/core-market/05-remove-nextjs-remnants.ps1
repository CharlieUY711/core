<#
.SYNOPSIS
  Elimina los restos de Next.js que quedaron de cuando este proyecto vivia
  dentro del monorepo ODDY (el package.json actual solo corre con Vite).

.IMPORTANTE
  Este script es mas delicado que 03/04: antes de correrlo con -Apply,
  confirma vos mismo que:
    1. `grep -r "next/" src` no devuelve nada relevante (ya se verifico
       GlobalSection.tsx, que se borra en el script 03).
    2. La carpeta app/ (app/admin/bulk-upload, app/api/bulk-upload, app/gate)
       realmente no se usa (no aparece en ningun deploy activo de Vercel/Next).
  Por eso pide confirmacion interactiva ademas del flag -Apply.

.USAGE
  cd C:\ruta\a\core-market
  .\05-remove-nextjs-remnants.ps1              # dry run
  .\05-remove-nextjs-remnants.ps1 -Apply       # borra de verdad (pide confirmacion)
#>

param(
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

$targets = @("next.config.js", "app")

Write-Host "Modo: $(if ($Apply) { 'APLICAR' } else { 'DRY-RUN' })" -ForegroundColor Cyan
Write-Host ""
Write-Host "Esto va a borrar (si confirmas):" -ForegroundColor Yellow
$targets | ForEach-Object { Write-Host "  - $_" }
Write-Host ""
Write-Host "Y va a quitar 'next' de dependencies en package.json." -ForegroundColor Yellow
Write-Host ""

if ($Apply) {
    $resp = Read-Host "Confirmaste que app/ y next.config.js no se usan? (escribi SI para continuar)"
    if ($resp -ne "SI") {
        Write-Host "Cancelado. No se borro nada." -ForegroundColor Red
        exit 0
    }
}

foreach ($t in $targets) {
    if (Test-Path $t) {
        if ($Apply) {
            Remove-Item -Path $t -Recurse -Force
            Write-Host "BORRADO: $t" -ForegroundColor Red
        } else {
            Write-Host "Se borraria: $t" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No existe (ya limpio): $t" -ForegroundColor DarkGray
    }
}

# Quitar la dependencia "next" del package.json
if (Test-Path "package.json") {
    $pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
    if ($pkg.dependencies.PSObject.Properties.Name -contains "next") {
        if ($Apply) {
            $pkg.dependencies.PSObject.Properties.Remove("next")
            $pkg | ConvertTo-Json -Depth 10 | Set-Content "package.json"
            Write-Host "BORRADO del package.json: dependencia 'next'" -ForegroundColor Red
            Write-Host "Corre 'pnpm install' (o npm/yarn) despues de esto para actualizar el lockfile." -ForegroundColor Yellow
        } else {
            Write-Host "Se quitaria del package.json: dependencia 'next'" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
if (-not $Apply) {
    Write-Host "Esto fue un dry-run. Nada se borro. Corre con -Apply para ejecutar de verdad." -ForegroundColor Cyan
} else {
    Write-Host "Listo. Corre 'pnpm install' y despues 'pnpm build' para confirmar que todo compila." -ForegroundColor Green
}
