<#
.SYNOPSIS
  Ordena archivos sueltos en la raiz: mueve los .ps1 de fixes a /scripts,
  la documentacion vieja del monorepo ODDY a /docs/legado, y el zip de
  figma a /design. No borra nada, solo mueve (con git mv si hay repo git).

.USAGE
  cd C:\ruta\a\core-market
  .\04-organizar-estructura.ps1              # dry run
  .\04-organizar-estructura.ps1 -Apply       # mueve de verdad
#>

param(
    [switch]$Apply
)

$ErrorActionPreference = "Stop"
$usarGit = Test-Path ".git"

function Move-Safe($origen, $destinoCarpeta) {
    if (-not (Test-Path $origen)) {
        Write-Host "No existe (salteo): $origen" -ForegroundColor DarkGray
        return
    }
    $destino = Join-Path $destinoCarpeta (Split-Path -Leaf $origen)
    if ($Apply) {
        New-Item -ItemType Directory -Force -Path $destinoCarpeta | Out-Null
        if ($usarGit) {
            git mv -- "$origen" "$destino"
        } else {
            Move-Item -Path $origen -Destination $destino -Force
        }
        Write-Host "MOVIDO: $origen -> $destino" -ForegroundColor Green
    } else {
        Write-Host "Se moveria: $origen -> $destino" -ForegroundColor Yellow
    }
}

Write-Host "Modo: $(if ($Apply) { 'APLICAR' } else { 'DRY-RUN' })" -ForegroundColor Cyan
Write-Host ""

# 1) Scripts .ps1 de fixes puntuales -> /scripts
Write-Host "--- Scripts de fixes ---" -ForegroundColor Cyan
@(
    "apply-editor-opcionA.ps1",
    "fix-botones-pares.ps1",
    "fix-exportar-saveas.ps1",
    "install-cmasiva.ps1"
) | ForEach-Object { Move-Safe $_ "scripts" }

# 2) Documentacion vieja del monorepo ODDY (no aplica 1:1 a este repo standalone) -> /docs/legado
Write-Host ""
Write-Host "--- Documentacion legada del monorepo ---" -ForegroundColor Cyan
@(
    "AUDITORIA_LOGISTICA.md",
    "AUDITORIA_MODULOS.md",
    "CHECKLIST_FIXES.md",
    "MIGRACION_STATUS.md",
    "INSTALACION.md",
    "FRONTSTORE_STANDALONE.md",
    "INTEGRACION_API_VAULT.md",
    "Resumen contextual #U2014 ODDY_Fron.txt",
    "hook.txt",
    "patch_hook.js",
    "extract-catalog.index.ts",
    "schema-dump.sql"
) | ForEach-Object { Move-Safe $_ "docs\legado" }

# 3) Asset de diseno -> /design
Write-Host ""
Write-Host "--- Assets de diseno ---" -ForegroundColor Cyan
Move-Safe "figma\project.zip" "design"

Write-Host ""
if (-not $Apply) {
    Write-Host "Esto fue un dry-run. Nada se movio. Corre con -Apply para ejecutar de verdad." -ForegroundColor Cyan
} else {
    Write-Host "Listo. Revisa 'git status' para confirmar los movimientos." -ForegroundColor Green
}
