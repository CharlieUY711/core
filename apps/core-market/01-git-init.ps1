<#
.SYNOPSIS
  Inicializa git en el repo si no existe, y hace el primer commit "tal cual está".
  Correr este script SIEMPRE primero, antes de cualquier otro script de limpieza.

.USAGE
  cd C:\ruta\a\core-market
  .\01-git-init.ps1
#>

$ErrorActionPreference = "Stop"

if (Test-Path ".git") {
    Write-Host "Ya existe .git en esta carpeta. No hago nada." -ForegroundColor Yellow
    exit 0
}

# Verifica que node_modules esté ignorado antes de commitear (no queremos 752MB en git)
$gitignore = Get-Content ".gitignore" -Raw -ErrorAction SilentlyContinue
if ($gitignore -notmatch "node_modules") {
    Write-Host "ADVERTENCIA: node_modules no aparece en .gitignore. Agregándolo." -ForegroundColor Yellow
    Add-Content ".gitignore" "`nnode_modules/"
}

git init
git add -A
git commit -m "chore: snapshot inicial antes de auditoria/limpieza (2026-07-05)"

Write-Host ""
Write-Host "Listo. Repo git inicializado con un commit base." -ForegroundColor Green
Write-Host "A partir de aca, cualquier script de limpieza es reversible con 'git checkout' o 'git revert'." -ForegroundColor Green
