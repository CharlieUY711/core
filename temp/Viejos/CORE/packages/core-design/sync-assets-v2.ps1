# ═══════════════════════════════════════════════════════════════
# CORE — Sincronizar assets de marca a cada app
# Ejecutar desde C:\CORE después de generate-assets.ps1
# ═══════════════════════════════════════════════════════════════

$base = "packages\core-design\public"

$appAssets = @(
  @{ app="apps\core-biblio";       id="biblio"      },
  @{ app="apps\core-fundation";    id="foundation"  },
  @{ app="apps\core-hub";          id="hub"         },
  @{ app="apps\core-landing";      id="core"        },
  @{ app="apps\core-market";       id="market"      },
  @{ app="apps\core-marketing";    id="marketing"   },
  @{ app="apps\core-presentaciones";id="marketing"  }
)

foreach ($item in $appAssets) {
  $app = $item.app
  $id  = $item.id
  if (-not (Test-Path $app)) { continue }

  $pub = "$app\public"
  New-Item -ItemType Directory -Force -Path $pub | Out-Null

  # favicon específico del producto
  Copy-Item "$base\favicons\favicon-$id.svg"    "$pub\favicon.svg"       -Force
  # logo específico del producto
  Copy-Item "$base\logos\logo-$id.svg"          "$pub\logo.svg"          -Force
  Copy-Item "$base\logos\logo-white-$id.svg"    "$pub\logo-white.svg"    -Force
  # favicon genérico CORE para referencia
  Copy-Item "$base\favicons\favicon-core.svg"   "$pub\favicon-core.svg"  -Force

  Write-Host "  ✓ $app ← assets '$id'" -ForegroundColor Green
}

Write-Host "`n✓ Assets sincronizados." -ForegroundColor Cyan
Write-Host "  Commitear en cada repo individual." -ForegroundColor Yellow
