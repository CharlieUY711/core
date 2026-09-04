# CORE — Script de sincronización de documentación
# Mueve archivos de "Sincronizacion Biblio" a sus rutas correctas

$base = "C:\CORE\Biblioteca"
$src  = "$base\Sincronizacion Biblio"

# ── Crear carpetas destino ──────────────────────────────────────────────────
$carpetas = @(
    "$base\docs\arquitectura",
    "$base\docs\estrategia",
    "$base\docs\infraestructura",
    "$base\docs\checklists",
    "$base\docs\productos",
    "$base\docs\roadmap",
    "$base\docs\prompts",
    "$base\public\docs"
)
foreach ($c in $carpetas) {
    if (-not (Test-Path $c)) {
        New-Item -ItemType Directory -Path $c -Force | Out-Null
        Write-Host "CREADA: $c"
    }
}

# ── Mover archivos a sus destinos ───────────────────────────────────────────
$mapa = @{
    "monorepo.md"            = "$base\docs\arquitectura\monorepo.md"
    "api-layer.md"           = "$base\docs\arquitectura\api-layer.md"
    "globe-engine.md"        = "$base\docs\arquitectura\globe-engine.md"
    "vision-2035.md"         = "$base\docs\estrategia\vision-2035.md"
    "expansion.md"           = "$base\docs\estrategia\expansion.md"
    "monetizacion.md"        = "$base\docs\estrategia\monetizacion.md"
    "vercel.md"              = "$base\docs\infraestructura\vercel.md"
    "supabase.md"            = "$base\docs\infraestructura\supabase.md"
    "pipelines.md"           = "$base\docs\infraestructura\pipelines.md"
    "checklist-maestro.md"   = "$base\docs\checklists\checklist-maestro.md"
    "core-biblioteca.md"     = "$base\docs\productos\core-biblioteca.md"
    "core-landing.md"        = "$base\docs\productos\core-landing.md"
    "core-globe.md"          = "$base\docs\productos\core-globe.md"
    "fases.md"               = "$base\docs\roadmap\fases.md"
    "CORE-PM-BIBLIO-0001.md" = "$base\docs\prompts\CORE-PM-BIBLIO-0001.md"
    "README.md"              = "$base\docs\prompts\README.md"
}

foreach ($archivo in $mapa.Keys) {
    $origen  = "$src\$archivo"
    $destino = $mapa[$archivo]
    if (Test-Path $origen) {
        Move-Item -Path $origen -Destination $destino -Force
        Write-Host "MOVIDO: $archivo → $destino"
    } else {
        Write-Host "NO ENCONTRADO: $archivo"
    }
}

# ── Eliminar carpeta mnt si existe dentro de src ────────────────────────────
$mntPath = "$src\mnt"
if (Test-Path $mntPath) {
    Remove-Item -Path $mntPath -Recurse -Force
    Write-Host "ELIMINADA: $mntPath"
}

# ── Eliminar carpeta fuente si está vacía ───────────────────────────────────
$restantes = Get-ChildItem -Path $src -Force
if ($restantes.Count -eq 0) {
    Remove-Item -Path $src -Force
    Write-Host "ELIMINADA carpeta: $src"
} else {
    Write-Host "ADVERTENCIA: carpeta no vacía, revisar manualmente: $src"
    $restantes | ForEach-Object { Write-Host "  → $_" }
}

# ── Eliminar zip con el mismo nombre si existe ──────────────────────────────
$zip = "$base\Sincronizacion Biblio.zip"
if (Test-Path $zip) {
    Remove-Item -Path $zip -Force
    Write-Host "ELIMINADO zip: $zip"
}

Write-Host ""
Write-Host "Sincronización completada."
