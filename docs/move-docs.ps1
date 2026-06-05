# move-docs.ps1
# Ejecutar desde cualquier carpeta: .\move-docs.ps1

$dest = "C:\CORE\docs"

# Crear carpeta si no existe
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest | Out-Null
    Write-Host "Carpeta creada: $dest"
}

# Archivos a mover (descargarlos primero desde Claude)
$files = @(
    "README.md",
    "00-architecture.md",
    "01-storyboard.md",
    "02-design-system.md",
    "03-supabase-i18n.md",
    "04-component-tree.md",
    "05-checklist.md"
)

$moved = 0
$notfound = 0

foreach ($file in $files) {
    # Buscar en Downloads y Desktop (lugares más comunes de descarga)
    $search = @(
        "$env:USERPROFILE\Downloads\$file",
        "$env:USERPROFILE\Desktop\$file",
        ".\$file"
    )

    $found = $false
    foreach ($path in $search) {
        if (Test-Path $path) {
            Copy-Item -Path $path -Destination "$dest\$file" -Force
            Write-Host "OK  $file" -ForegroundColor Green
            $moved++
            $found = $true
            break
        }
    }

    if (-not $found) {
        Write-Host "??  $file  (no encontrado)" -ForegroundColor Yellow
        $notfound++
    }
}

Write-Host ""
Write-Host "Resultado: $moved movidos, $notfound no encontrados"
Write-Host "Destino: $dest"
