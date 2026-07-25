<#
.SYNOPSIS
  Elimina archivos/carpetas confirmados como duplicados o codigo muerto
  (verificado: no estan importados desde ningun lado del proyecto).

.DESCRIPTION
  Por defecto corre en modo DRY-RUN: solo muestra que borraria.
  Pasa -Apply para que borre de verdad.

.USAGE
  cd C:\ruta\a\core-market
  .\03-remove-dead-code.ps1              # dry run
  .\03-remove-dead-code.ps1 -Apply       # borra de verdad
#>

param(
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

# Lista de paths confirmados como seguros para borrar (ver auditoria).
# Cada uno fue chequeado con grep/diff antes de listarlo aca.
$targets = @(
    "src\src",                                   # carpeta fantasma, carritoApi.ts viejo sin uso
    "functions\crear-orden",                     # duplicado byte-a-byte de supabase\functions\crear-orden
    "src\components\GlobalSection.tsx",          # no importado por nadie, ademas rompe el build (usa next/dynamic)
    ".bak_precarrito_20260612_130241",           # backup manual viejo, ya versionado en git
    "package.json.backup.txt",                   # backup manual viejo
    "middleware.ts.bak",                          # resto de Next, no se usa en Vite
    "carritoApi-fix (1).zip",
    "carritoApi-fix (3).zip",
    "crear-orden-fix-v3 (1).zip",
    "carritoApi-fix (1)"                          # carpeta que contiene otro zip anidado
)

Write-Host "Modo: $(if ($Apply) { 'APLICAR (borra de verdad)' } else { 'DRY-RUN (solo muestra)' })" -ForegroundColor Cyan
Write-Host ""

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

Write-Host ""
if (-not $Apply) {
    Write-Host "Esto fue un dry-run. Nada se borro. Corre con -Apply para ejecutar de verdad." -ForegroundColor Cyan
} else {
    Write-Host "Listo. Revisa 'git status' y 'npm run build' / 'pnpm build' para confirmar que todo sigue andando." -ForegroundColor Green
}
