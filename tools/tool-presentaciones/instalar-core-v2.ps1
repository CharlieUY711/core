# CORE Experience — Script corregido
# Los archivos ya están en core-experience\, solo moverlos a sus rutas correctas

$project = "C:\CORE\apps\core-presentaciones\core-experience"

Write-Host ""
Write-Host "CORE Experience — Moviendo archivos a sus rutas correctas..." -ForegroundColor DarkYellow
Write-Host ""

$moves = @(
    @{
        from = "$project\page.tsx"
        to   = "$project\app\page.tsx"
    },
    @{
        from = "$project\lib\experience\i18n-context.tsx"
        to   = "$project\lib\experience\i18n-context.tsx"
    },
    @{
        from = "$project\components\experience\ExperienceNav.tsx"
        to   = "$project\components\experience\ExperienceNav.tsx"
    },
    @{
        from = "$project\components\experience\sections\HeroSection.tsx"
        to   = "$project\components\experience\sections\HeroSection.tsx"
    },
    @{
        from = "$project\components\experience\sections\FragmentationSection.tsx"
        to   = "$project\components\experience\sections\FragmentationSection.tsx"
    },
    @{
        from = "$project\components\experience\sections\WhatIfSection.tsx"
        to   = "$project\components\experience\sections\WhatIfSection.tsx"
    },
    @{
        from = "$project\components\experience\sections\DifferenceSection.tsx"
        to   = "$project\components\experience\sections\DifferenceSection.tsx"
    },
    @{
        from = "$project\components\experience\sections\GlobalSection.tsx"
        to   = "$project\components\experience\sections\GlobalSection.tsx"
    },
    @{
        from = "$project\components\experience\sections\VisionSection.tsx"
        to   = "$project\components\experience\sections\VisionSection.tsx"
    },
    @{
        from = "$project\components\experience\sections\GlosarioSection.tsx"
        to   = "$project\components\experience\sections\GlosarioSection.tsx"
    },
    @{
        from = "$project\components\experience\sections\CTASection.tsx"
        to   = "$project\components\experience\sections\CTASection.tsx"
    }
)

$ok = 0
$skip = 0

foreach ($m in $moves) {
    # page.tsx es el único que se mueve a una carpeta diferente (app/)
    if ($m.from -eq $m.to) {
        Write-Host "  OK (ya en su lugar)  $(Split-Path $m.to -Leaf)" -ForegroundColor Cyan
        $skip++
        continue
    }

    $toDir = Split-Path $m.to -Parent
    if (-not (Test-Path $toDir)) {
        New-Item -ItemType Directory -Path $toDir -Force | Out-Null
    }

    if (Test-Path $m.from) {
        Copy-Item -Path $m.from -Destination $m.to -Force
        Write-Host "  MOVIDO  $(Split-Path $m.from -Leaf)  ->  $($m.to.Replace($project, ''))" -ForegroundColor Green
        $ok++
    } else {
        Write-Host "  NO ENCONTRADO  $($m.from)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Resultado: $ok movidos, $skip ya en su lugar." -ForegroundColor DarkYellow
Write-Host ""

# Verificar que app/page.tsx existe
$appPage = "$project\app\page.tsx"
if (Test-Path $appPage) {
    Write-Host "app\page.tsx confirmado." -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: app\page.tsx no encontrado. Verifica que la carpeta 'app' existe en el proyecto." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Listo. Ejecuta: npm run dev" -ForegroundColor Cyan
Write-Host ""
