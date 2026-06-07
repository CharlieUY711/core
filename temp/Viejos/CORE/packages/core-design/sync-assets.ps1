# ═══════════════════════════════════════════════════════════════
# CORE — Sincronizar assets de marca a todas las apps
# Ejecutar desde C:\CORE cada vez que se actualice un asset visual
# ═══════════════════════════════════════════════════════════════

$source = "packages\core-design\public"
$apps = @(
  "apps\core-biblio\public",
  "apps\core-fundation\public",
  "apps\core-hub\public",
  "apps\core-landing\public",
  "apps\core-market\public",
  "apps\core-presentaciones\public"
)

$assets = @("favicon.svg", "logo.svg", "logo-white.svg")

foreach ($app in $apps) {
  if (-not (Test-Path $app)) {
    New-Item -ItemType Directory -Force -Path $app | Out-Null
  }
  foreach ($asset in $assets) {
    $src = "$source\$asset"
    $dst = "$app\$asset"
    if (Test-Path $src) {
      Copy-Item $src $dst -Force
      Write-Host "  ✓ $asset → $app" -ForegroundColor Green
    }
  }
}

Write-Host "`n✓ Assets sincronizados en todas las apps." -ForegroundColor Cyan
Write-Host "  Recuerda commitear los cambios en cada repo." -ForegroundColor Yellow
