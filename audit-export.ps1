$Output = Join-Path (Get-Location) "audit-export"

Write-Host ""
Write-Host "========================================"
Write-Host "CORE AUDIT EXPORT"
Write-Host "========================================"
Write-Host ""

if (Test-Path $Output) {
    Remove-Item $Output -Recurse -Force
}

New-Item -ItemType Directory -Path $Output | Out-Null

# ----------------------------------------------------
# ESTRUCTURA GENERAL
# ----------------------------------------------------

Write-Host "Exportando estructura..."

cmd /c tree /F /A > "$Output\tree.txt"

Get-ChildItem -Force |
Format-Table Name,Mode,LastWriteTime -AutoSize |
Out-File "$Output\root.txt"

# ----------------------------------------------------
# PACKAGES
# ----------------------------------------------------

if (Test-Path ".\packages") {

    Get-ChildItem .\packages -Directory |
    Select-Object Name |
    Out-File "$Output\packages.txt"

}

# ----------------------------------------------------
# APPS
# ----------------------------------------------------

if (Test-Path ".\apps") {

    Get-ChildItem .\apps -Directory |
    Select-Object Name |
    Out-File "$Output\apps.txt"

}

# ----------------------------------------------------
# PACKAGE.JSON
# ----------------------------------------------------

Write-Host "Exportando package.json..."

$packageFiles = Get-ChildItem -Recurse -Filter package.json -ErrorAction SilentlyContinue

foreach ($file in $packageFiles) {

    Add-Content "$Output\package-jsons.txt" ""
    Add-Content "$Output\package-jsons.txt" "================================================"
    Add-Content "$Output\package-jsons.txt" $file.FullName
    Add-Content "$Output\package-jsons.txt" "================================================"

    Get-Content $file.FullName |
    Add-Content "$Output\package-jsons.txt"

}

# ----------------------------------------------------
# README
# ----------------------------------------------------

Write-Host "Exportando readmes..."

Get-ChildItem -Recurse -Filter README.md -ErrorAction SilentlyContinue |
ForEach-Object {

    Add-Content "$Output\readmes.txt" ""
    Add-Content "$Output\readmes.txt" $_.FullName

}

# ----------------------------------------------------
# CONFIGURACIONES
# ----------------------------------------------------

Write-Host "Exportando configs..."

Get-ChildItem -Recurse -ErrorAction SilentlyContinue |
Where-Object {
    $_.Name -match "tsconfig|next\.config|vite\.config|tailwind"
} |
Select-Object FullName |
Out-File "$Output\configs.txt"

# ----------------------------------------------------
# FOUNDATION
# ----------------------------------------------------

Write-Host "Exportando Foundation..."

if (Test-Path ".\packages") {

    Get-ChildItem .\packages -Recurse -ErrorAction SilentlyContinue |
    Select-Object FullName |
    Out-File "$Output\foundation-files.txt"

}

# ----------------------------------------------------
# SUPABASE
# ----------------------------------------------------

Write-Host "Buscando Supabase..."

if (Test-Path ".\supabase") {

    Get-ChildItem .\supabase -Recurse -ErrorAction SilentlyContinue |
    Select-Object FullName |
    Out-File "$Output\supabase-files.txt"

}

# ----------------------------------------------------
# DEPENDENCIAS
# ----------------------------------------------------

Write-Host "Analizando dependencias..."

foreach ($file in $packageFiles) {

    try {

        $json = Get-Content $file.FullName -Raw | ConvertFrom-Json

        Add-Content "$Output\dependencies.txt" ""
        Add-Content "$Output\dependencies.txt" "================================================"
        Add-Content "$Output\dependencies.txt" $file.FullName
        Add-Content "$Output\dependencies.txt" "================================================"

        if ($json.dependencies) {

            Add-Content "$Output\dependencies.txt" "DEPENDENCIES"

            $json.dependencies |
            Out-String |
            Add-Content "$Output\dependencies.txt"

        }

        if ($json.devDependencies) {

            Add-Content "$Output\dependencies.txt" "DEV DEPENDENCIES"

            $json.devDependencies |
            Out-String |
            Add-Content "$Output\dependencies.txt"

        }

    }
    catch {

        Add-Content "$Output\dependencies.txt" "ERROR LEYENDO $($file.FullName)"

    }
}

# ----------------------------------------------------
# INTEGRACIONES
# ----------------------------------------------------

Write-Host "Buscando integraciones..."

$patterns = @(
    "supabase",
    "stripe",
    "paypal",
    "mercadopago",
    "mercado pago",
    "fedex",
    "dhl",
    "ups",
    "maersk",
    "resend",
    "auth0"
)

$codeFiles = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx -ErrorAction SilentlyContinue

foreach ($pattern in $patterns) {

    Add-Content "$Output\integrations.txt" ""
    Add-Content "$Output\integrations.txt" "===================="
    Add-Content "$Output\integrations.txt" $pattern
    Add-Content "$Output\integrations.txt" "===================="

    Select-String `
        -Path $codeFiles.FullName `
        -Pattern $pattern `
        -SimpleMatch `
        -ErrorAction SilentlyContinue |
    Select-Object Path,LineNumber,Line |
    Format-Table -Wrap |
    Out-String |
    Add-Content "$Output\integrations.txt"

}

# ----------------------------------------------------
# RESUMEN
# ----------------------------------------------------

@"
CORE AUDIT EXPORT

Archivos generados:

tree.txt
root.txt
packages.txt
apps.txt
package-jsons.txt
readmes.txt
configs.txt
foundation-files.txt
supabase-files.txt
dependencies.txt
integrations.txt

"@ | Out-File "$Output\README.txt"

Write-Host ""
Write-Host "========================================"
Write-Host "AUDITORIA COMPLETADA"
Write-Host "========================================"
Write-Host ""
Write-Host "Resultado:"
Write-Host $Output
Write-Host ""