# CORE Market — Script de organización
# Mueve archivos sueltos a sus carpetas correctas
# y elimina carpeta mnt si existe

$base = "C:\CORE\Market"

# ── Mover archivos a sus destinos ───────────────
$mapa = @{
    "2026.md"                          = "$base\roadmap\2026.md"
    "architecture.md"                  = "$base\docs\architecture.md"
    "brand.css"                        = "$base\design\brand.css"
    "core-market-patch.css"            = "$base\design\core-market-patch.css"
    "CORE-PM-MARKET-MIGRATION-0001.md" = "$base\prompts\CORE-PM-MARKET-MIGRATION-0001.md"
    "CORE-PM-MARKET-RESTRUCTURE-0001.md" = "$base\prompts\CORE-PM-MARKET-RESTRUCTURE-0001.md"
    "market-env.md"                    = "$base\env\market-env.md"
    "README.md"                        = "$base\docs\README.md"
    "theme.css"                        = "$base\design\theme.css"
    "visual-system.md"                 = "$base\design\visual-system.md"
}

foreach ($archivo in $mapa.Keys) {
    $origen  = "$base\$archivo"
    $destino = $mapa[$archivo]
    if (Test-Path $origen) {
        Move-Item -Path $origen -Destination $destino -Force
        Write-Host "MOVIDO: $archivo → $destino"
    } else {
        Write-Host "NO ENCONTRADO: $archivo"
    }
}

# ── Eliminar carpeta mnt ─────────────────────────
$mnt = "$base\mnt"
if (Test-Path $mnt) {
    Remove-Item -Path $mnt -Recurse -Force
    Write-Host "ELIMINADA: $mnt"
}

# ── Copiar CSS al proyecto ───────────────────────
$estilos = @(
    @{ src = "$base\design\brand.css";             dst = "C:\CORE\apps\core-market\src\styles\brand.css" },
    @{ src = "$base\design\theme.css";             dst = "C:\CORE\apps\core-market\src\styles\theme.css" },
    @{ src = "$base\design\core-market-patch.css"; dst = "C:\CORE\apps\core-market\src\styles\core-market-patch.css" }
)

foreach ($e in $estilos) {
    Copy-Item -Path $e.src -Destination $e.dst -Force
    Write-Host "COPIADO: $($e.src) → $($e.dst)"
}

# ── Agregar import en index.css si no existe ────
$indexCss = "C:\CORE\apps\core-market\src\styles\index.css"
$importLine = "@import './core-market-patch.css';"
$contenido = Get-Content $indexCss -Raw
if ($contenido -notmatch [regex]::Escape($importLine)) {
    Add-Content $indexCss "`n$importLine"
    Write-Host "IMPORT AGREGADO: $importLine → $indexCss"
} else {
    Write-Host "IMPORT YA EXISTE: $indexCss"
}

# ── Renombrar package.json ───────────────────────
$pkgJson = "C:\CORE\apps\core-market\package.json"
(Get-Content $pkgJson) -replace '"oddy-frontstore-standalone"', '"core-market"' | Set-Content $pkgJson
Write-Host "PACKAGE RENOMBRADO: core-market"

Write-Host ""
Write-Host "Organización completada."
