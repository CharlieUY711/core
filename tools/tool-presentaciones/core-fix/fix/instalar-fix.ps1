# CORE Experience — Instalación final (rutas correctas)
# Copia archivos al proyecto raíz en core-presentaciones

$root = "C:\CORE\apps\core-presentaciones"
$src  = "C:\CORE\apps\core-presentaciones\core-experience\core-experience"

# Si el ZIP se descomprimió diferente, ajustar $src:
# Verificar con: Get-ChildItem $src

Write-Host ""
Write-Host "CORE — Instalando en proyecto raiz..." -ForegroundColor DarkYellow
Write-Host ""

$moves = @(
    @{ from = "app\page.tsx";                                                        to = "app\page.tsx" },
    @{ from = "lib\experience\i18n.ts";                                              to = "lib\experience\i18n.ts" },
    @{ from = "components\experience\sections\FragmentationSection.tsx";             to = "components\experience\sections\FragmentationSection.tsx" },
    @{ from = "components\experience\sections\WhatIfSection.tsx";                    to = "components\experience\sections\WhatIfSection.tsx" },
    @{ from = "components\experience\sections\DifferenceSection.tsx";                to = "components\experience\sections\DifferenceSection.tsx" },
    @{ from = "components\experience\sections\GlobalSection.tsx";                    to = "components\experience\sections\GlobalSection.tsx" },
    @{ from = "components\experience\sections\VisionSection.tsx";                    to = "components\experience\sections\VisionSection.tsx" },
    @{ from = "components\experience\sections\GlosarioSection.tsx";                  to = "components\experience\sections\GlosarioSection.tsx" }
)

$ok = 0; $err = 0

foreach ($m in $moves) {
    $fromPath = Join-Path $src  $m.from
    $toPath   = Join-Path $root $m.to
    $toDir    = Split-Path $toPath -Parent

    if (-not (Test-Path $toDir)) {
        New-Item -ItemType Directory -Path $toDir -Force | Out-Null
    }

    if (Test-Path $fromPath) {
        Copy-Item -Path $fromPath -Destination $toPath -Force
        Write-Host "  OK  $($m.to)" -ForegroundColor Green
        $ok++
    } else {
        Write-Host "  NO ENCONTRADO  $fromPath" -ForegroundColor Red
        $err++
    }
}

Write-Host ""
Write-Host "Resultado: $ok copiados, $err errores." -ForegroundColor DarkYellow

if ($err -gt 0) {
    Write-Host ""
    Write-Host "Algunos archivos no se encontraron en $src" -ForegroundColor Yellow
    Write-Host "Verifica la ruta con: Get-ChildItem '$src' -Recurse" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Verificando build local..." -ForegroundColor Cyan
Write-Host "Ejecuta: npm run build" -ForegroundColor Cyan
Write-Host ""
