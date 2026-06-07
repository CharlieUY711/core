# crear-paquete-api-vault.ps1
# Crea packages/api-vault en el monorepo CORE y lo integra con core-market.

$mono   = "C:\CORE"
$src    = "C:\CORE\temp\api-vault-core-market"
$pkg    = "$mono\packages\api-vault"
$market = "$mono\apps\core-market"

Write-Host ""
Write-Host "=== Creando @charlieuy711/api-vault ===" -ForegroundColor Cyan

# 1. Crear estructura de carpetas
$dirs = @(
    "$pkg"
    "$pkg\src\services"
    "$pkg\src\hooks"
    "$pkg\src\components"
    "$pkg\supabase\migrations"
)
foreach ($d in $dirs) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
        Write-Host "  MKDIR  $d" -ForegroundColor DarkGray
    }
}

# 2. Copiar archivos del paquete
$pkgFiles = @(
    @{ from = "package.json";                                      to = "package.json" },
    @{ from = "tsconfig.json";                                     to = "tsconfig.json" },
    @{ from = "src\index.ts";                                     to = "src\index.ts" },
    @{ from = "src\services\apiVaultTypes.ts";                   to = "src\services\apiVaultTypes.ts" },
    @{ from = "src\services\apiVaultService.ts";                 to = "src\services\apiVaultService.ts" },
    @{ from = "src\services\index.ts";                           to = "src\services\index.ts" },
    @{ from = "src\hooks\useApiVault.ts";                        to = "src\hooks\useApiVault.ts" },
    @{ from = "src\hooks\index.ts";                              to = "src\hooks\index.ts" },
    @{ from = "src\components\ApiVaultPage.tsx";                 to = "src\components\ApiVaultPage.tsx" },
    @{ from = "src\components\index.ts";                         to = "src\components\index.ts" },
    @{ from = "supabase\migrations\20260607_api_vault.sql";      to = "supabase\migrations\20260607_api_vault.sql" }
)

$pkgSrc = "C:\CORE\temp\api-vault-pkg"
foreach ($f in $pkgFiles) {
    $s = Join-Path $pkgSrc $f.from
    $d = Join-Path $pkg    $f.to
    if (Test-Path $s) {
        Copy-Item $s $d -Force
        Write-Host "  OK     packages\api-vault\$($f.to)" -ForegroundColor Green
    } else {
        Write-Host "  FALTA  $($f.from)" -ForegroundColor Yellow
    }
}

# 3. Agregar dependencia en core-market/package.json
$mpkg = "$market\package.json"
$mj   = Get-Content $mpkg -Raw | ConvertFrom-Json
if (-not $mj.dependencies."@charlieuy711/api-vault") {
    $mj.dependencies | Add-Member -NotePropertyName "@charlieuy711/api-vault" -NotePropertyValue "workspace:*"
    $mj | ConvertTo-Json -Depth 10 | Set-Content $mpkg -Encoding UTF8
    Write-Host "  OK     core-market/package.json (+dependency)" -ForegroundColor Green
} else {
    Write-Host "  SKIP   core-market/package.json (ya tiene dependencia)" -ForegroundColor DarkYellow
}

# 4. Actualizar AdminApiVault.tsx para usar el paquete en lugar de la ruta relativa
$avPage = "$market\src\app\admin\pages\AdminApiVault.tsx"
if (Test-Path $avPage) {
    Write-Host "  INFO   AdminApiVault.tsx ya existe en core-market (instalacion anterior)" -ForegroundColor DarkGray
    Write-Host "         Podras reemplazarlo por la version del paquete cuando construyas." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Hecho. Proximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Mover los archivos del paquete: ver instrucciones arriba"
Write-Host "  2. Desde C:\CORE ejecutar: pnpm install"
Write-Host "  3. Desde C:\CORE ejecutar: pnpm run build"
Write-Host "  4. Ejecutar la migracion SQL en Supabase si no lo hiciste"
Write-Host ""
