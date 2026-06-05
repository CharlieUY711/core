# ═══════════════════════════════════════════════════════════════
# CORE — Generador de assets de marca por producto
# Ejecutar desde C:\CORE
# ═══════════════════════════════════════════════════════════════

$NAVY   = "#0A1F3D"
$BLUE   = "#1b5ac4"
$GOLD   = "#c9993a"
$WHITE  = "white"
$FONT   = "-apple-system, BlinkMacSystemFont, 'Geist', 'Segoe UI', sans-serif"

# ── Definición de cada producto ──────────────────────────────
$products = @(
  @{ id="core";          initial="C"; name="CORE";        byline="Global Supply. Regional Growth."; bg=$BLUE   },
  @{ id="market";        initial="M"; name="MARKET";      byline="by CORE";                         bg=$BLUE   },
  @{ id="biblio";        initial="B"; name="BIBLIOTECA";  byline="by CORE";                         bg=$NAVY   },
  @{ id="foundation";    initial="F"; name="FOUNDATION";  byline="by CORE";                         bg=$NAVY   },
  @{ id="hub";           initial="H"; name="HUB";         byline="by CORE";                         bg=$NAVY   },
  @{ id="marketing";     initial="M"; name="MARKETING";   byline="by CORE";                         bg=$BLUE   },
  @{ id="logistics";     initial="L"; name="LOGISTICS";   byline="by CORE";                         bg=$BLUE   },
  @{ id="customs";       initial="C"; name="CUSTOMS";     byline="by CORE";                         bg=$NAVY   },
  @{ id="intelligence";  initial="I"; name="INTELLIGENCE";byline="by CORE";                         bg=$BLUE   },
  @{ id="finance";       initial="F"; name="FINANCE";     byline="by CORE";                         bg=$NAVY   }
)

$outDir = "packages\core-design\public"
New-Item -ItemType Directory -Force -Path "$outDir\favicons" | Out-Null
New-Item -ItemType Directory -Force -Path "$outDir\logos"    | Out-Null

foreach ($p in $products) {
  $id      = $p.id
  $initial = $p.initial
  $name    = $p.name
  $byline  = $p.byline
  $bg      = $p.bg

  # ── favicon.svg ─────────────────────────────────────────────
  $favicon = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="$bg"/>
  <text x="16" y="23" font-family="$FONT" font-size="21" font-weight="700" fill="$WHITE" text-anchor="middle" letter-spacing="-0.5">$initial</text>
</svg>
"@
  $favicon | Set-Content "$outDir\favicons\favicon-$id.svg" -Encoding UTF8

  # ── logo.svg (wordmark horizontal) ──────────────────────────
  $logo = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40">
  <rect width="40" height="40" rx="8" fill="$bg"/>
  <text x="20" y="28" font-family="$FONT" font-size="22" font-weight="700" fill="$WHITE" text-anchor="middle" letter-spacing="-0.5">$initial</text>
  <text x="54" y="22" font-family="$FONT" font-size="16" font-weight="700" fill="#FFFFFF" letter-spacing="1.5">$name</text>
  <text x="54" y="35" font-family="$FONT" font-size="9" font-weight="400" fill="#8fa3bf" letter-spacing="0.5">$byline</text>
</svg>
"@
  $logo | Set-Content "$outDir\logos\logo-$id.svg" -Encoding UTF8

  # ── logo-white.svg (para fondos oscuros — misma lógica) ──────
  $logoWhite = @"
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40">
  <rect width="40" height="40" rx="8" fill="rgba(255,255,255,0.12)"/>
  <text x="20" y="28" font-family="$FONT" font-size="22" font-weight="700" fill="$WHITE" text-anchor="middle" letter-spacing="-0.5">$initial</text>
  <text x="54" y="22" font-family="$FONT" font-size="16" font-weight="700" fill="#FFFFFF" letter-spacing="1.5">$name</text>
  <text x="54" y="35" font-family="$FONT" font-size="9" font-weight="400" fill="rgba(255,255,255,0.45)" letter-spacing="0.5">$byline</text>
</svg>
"@
  $logoWhite | Set-Content "$outDir\logos\logo-white-$id.svg" -Encoding UTF8

  Write-Host "  ✓ $id — favicon + logo + logo-white" -ForegroundColor Green
}

Write-Host "`n✓ Todos los assets generados en $outDir" -ForegroundColor Cyan
