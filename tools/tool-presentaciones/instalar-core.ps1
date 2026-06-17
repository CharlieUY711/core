# CORE Experience — Script de instalación de archivos
# Ejecutar desde PowerShell en cualquier ubicación
# Mueve los archivos generados a sus rutas correctas dentro del proyecto

$base = "C:\CORE\apps\core-presentaciones\core-experience"
$src  = "$base\core-experience"

Write-Host ""
Write-Host "CORE Experience — Instalando archivos..." -ForegroundColor DarkYellow
Write-Host ""

# Definición de movimientos: origen relativo al ZIP → destino relativo al proyecto
$moves = @(
    @{ from = "page.tsx";                                                              to = "app\page.tsx" },
    @{ from = "lib\experience\i18n-context.tsx";                                       to = "lib\experience\i18n-context.tsx" },
    @{ from = "components\experience\ExperienceNav.tsx";                               to = "components\experience\ExperienceNav.tsx" },
    @{ from = "components\experience\sections\HeroSection.tsx";                        to = "components\experience\sections\HeroSection.tsx" },
    @{ from = "components\experience\sections\FragmentationSection.tsx";               to = "components\experience\sections\FragmentationSection.tsx" },
    @{ from = "components\experience\sections\WhatIfSection.tsx";                      to = "components\experience\sections\WhatIfSection.tsx" },
    @{ from = "components\experience\sections\DifferenceSection.tsx";                  to = "components\experience\sections\DifferenceSection.tsx" },
    @{ from = "components\experience\sections\GlobalSection.tsx";                      to = "components\experience\sections\GlobalSection.tsx" },
    @{ from = "components\experience\sections\VisionSection.tsx";                      to = "components\experience\sections\VisionSection.tsx" },
    @{ from = "components\experience\sections\GlosarioSection.tsx";                    to = "components\experience\sections\GlosarioSection.tsx" },
    @{ from = "components\experience\sections\CTASection.tsx";                         to = "components\experience\sections\CTASection.tsx" }
)

$ok    = 0
$error = 0

foreach ($m in $moves) {
    $fromPath = Join-Path $src  $m.from
    $toPath   = Join-Path $base $m.to

    # Crear carpeta destino si no existe
    $toDir = Split-Path $toPath -Parent
    if (-not (Test-Path $toDir)) {
        New-Item -ItemType Directory -Path $toDir -Force | Out-Null
    }

    if (Test-Path $fromPath) {
        Copy-Item -Path $fromPath -Destination $toPath -Force
        Write-Host "  OK  $($m.to)" -ForegroundColor Green
        $ok++
    } else {
        Write-Host "  NO ENCONTRADO  $($m.from)" -ForegroundColor Red
        $error++
    }
}

Write-Host ""
Write-Host "Resultado: $ok archivos copiados, $error errores." -ForegroundColor DarkYellow

if ($error -eq 0) {
    Write-Host ""
    Write-Host "Todo listo. Puedes ejecutar: cd $base && npm run dev" -ForegroundColor Cyan
}
Write-Host ""
