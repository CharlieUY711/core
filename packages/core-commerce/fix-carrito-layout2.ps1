
# ============================================================
# FIX CARRITO -> usar vista carrito_detalle
# CORE
# Ejecutar desde la raíz del proyecto:
#
#    .\fix-carrito-detalle.ps1
#
# ============================================================

$ErrorActionPreference = "Stop"

$files = @(
    "src\app\services\carritoApi.ts",
    "packages\core-carrito\src\services\carritoApi.ts"
)

foreach ($file in $files) {

    if (!(Test-Path $file)) {
        Write-Host "SKIP $file"
        continue
    }

    Write-Host ""
    Write-Host "Patching $file"

    $txt = Get-Content $file -Raw

    #--------------------------------------------------------
    # Cambiar .from("carrito")
    #--------------------------------------------------------

    $txt = $txt.Replace(
'.from("carrito")
    .select("*")',
'.from("carrito_detalle")
    .select("*")'
    )

    #--------------------------------------------------------
    # Agregar nombre / imagen / moneda al interface
    #--------------------------------------------------------

    if ($txt -notmatch "nombre\?\s*:") {

        $txt = $txt.Replace(
'  precio_unitario: number;
  created_at?: string;
  updated_at?: string;',
@'
  precio_unitario: number;

  moneda?: string;

  nombre?: string;

  imagen?: string;

  created_at?: string;

  updated_at?: string;
'@
)

    }

    Set-Content $file $txt -Encoding UTF8

    Write-Host "OK $file"

}

Write-Host ""
Write-Host "====================================="
Write-Host " Patch aplicado correctamente"
Write-Host "====================================="
Write-Host ""
Write-Host "Ahora ejecutar:"
Write-Host ""
Write-Host "    pnpm dev"
Write-Host ""

