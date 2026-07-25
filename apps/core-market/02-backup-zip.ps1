<#
.SYNOPSIS
  Crea un backup .zip del proyecto (sin node_modules ni dist) como red de
  seguridad extra, independiente de git. Lo deja un nivel arriba del proyecto.

.USAGE
  cd C:\ruta\a\core-market
  .\02-backup-zip.ps1
#>

$ErrorActionPreference = "Stop"

$projectName = Split-Path -Leaf (Get-Location)
$timestamp   = Get-Date -Format "yyyyMMdd_HHmmss"
$destino     = Join-Path (Split-Path -Parent (Get-Location)) "$projectName`_backup_$timestamp.zip"

$excluir = @("node_modules", "dist", ".vercel", ".git")

Write-Host "Armando lista de archivos (excluyendo: $($excluir -join ', '))..." -ForegroundColor Cyan

$items = Get-ChildItem -Path . -Force | Where-Object { $excluir -notcontains $_.Name }

if (Test-Path $destino) {
    Write-Host "Ya existe un backup con ese nombre, se sobreescribe." -ForegroundColor Yellow
    Remove-Item $destino -Force
}

Compress-Archive -Path $items.FullName -DestinationPath $destino -CompressionLevel Optimal

Write-Host ""
Write-Host "Backup creado en: $destino" -ForegroundColor Green
