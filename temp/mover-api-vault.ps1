$source = "C:\CORE\temp\api-vault-core-market"
$target = "C:\CORE\apps\core-market"

Write-Host ""
Write-Host "=== API Vault - Instalacion ===" -ForegroundColor Cyan
Write-Host "  Origen : $source"
Write-Host "  Destino: $target"
Write-Host ""

if (-not (Test-Path $source)) { Write-Host "ERROR: origen no encontrado" -ForegroundColor Red; exit 1 }
if (-not (Test-Path $target)) { Write-Host "ERROR: destino no encontrado" -ForegroundColor Red; exit 1 }

$files = @(
    @{ from = "src\app\admin\services\apiVaultTypes.ts";    to = "src\app\admin\services\apiVaultTypes.ts" },
    @{ from = "src\app\admin\services\apiVaultService.ts";  to = "src\app\admin\services\apiVaultService.ts" },
    @{ from = "src\app\admin\hooks\useApiVault.ts";         to = "src\app\admin\hooks\useApiVault.ts" },
    @{ from = "src\app\admin\pages\AdminApiVault.tsx";      to = "src\app\admin\pages\AdminApiVault.tsx" },
    @{ from = "supabase\migrations\20260607_api_vault.sql";   to = "supabase\migrations\20260607_api_vault.sql" },
    @{ from = "INTEGRACION.md";                                 to = "INTEGRACION_API_VAULT.md" }
)

$ok = 0; $skipped = 0

foreach ($f in $files) {
    $srcPath = Join-Path $source $f.from
    $dstPath = Join-Path $target $f.to
    $dstDir  = Split-Path $dstPath -Parent

    if (-not (Test-Path $srcPath)) {
        Write-Host "  FALTA   $($f.from)" -ForegroundColor Yellow
        $skipped++; continue
    }

    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        Write-Host "  CREADA  $dstDir" -ForegroundColor DarkGray
    }

    if (Test-Path $dstPath) {
        $resp = Read-Host "  Ya existe $($f.to). Sobreescribir? [s/N]"
        if ($resp -notin @("s","S","y","Y")) {
            Write-Host "  OMITIDO $($f.to)" -ForegroundColor DarkYellow
            $skipped++; continue
        }
    }

    Copy-Item -Path $srcPath -Destination $dstPath -Force
    Write-Host "  OK      $($f.to)" -ForegroundColor Green
    $ok++
}

Write-Host ""
Write-Host "Resultado: $ok copiado(s), $skipped omitido(s)." -ForegroundColor Cyan
Write-Host ""
Write-Host "Pasos siguientes:"
Write-Host "  1. Ejecutar 20260607_api_vault.sql en Supabase SQL Editor"
Write-Host "  2. Agregar ruta en src/app/App.tsx"
Write-Host "  3. Agregar link en el sidebar admin"
Write-Host ""
