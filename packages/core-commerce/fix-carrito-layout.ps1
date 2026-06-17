```powershell
# fix-carrito-layout.ps1
# Ejecutar desde:
# C:\CORE\packages\core-carrito
#
# IMPORTANTE:
# Este script SOLO modifica el código fuente del paquete.
# NUNCA toca node_modules ni .pnpm.
#
# Luego simplemente reiniciar:
#   pnpm dev
#
# o, si corresponde:
#   pnpm build

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot

$target = Join-Path $root "src\CarritoModule.tsx"

if (-not (Test-Path $target)) {
    throw "No se encontró: $target"
}

function Patch-File {
    param(
        [string]$old,
        [string]$new,
        [string]$desc
    )

    $content = [System.IO.File]::ReadAllText($target)

    if (-not $content.Contains($old)) {
        Write-Warning "$desc -> texto no encontrado (¿ya aplicado?)"
        return
    }

    $content = $content.Replace($old, $new)

    [System.IO.File]::WriteAllText(
        $target,
        $content,
        [System.Text.Encoding]::UTF8
    )

    Write-Host "OK  $desc" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================="
Write-Host " Patch CarritoModule"
Write-Host "========================================="
Write-Host ""

# --------------------------------------------------------
# PATCH 1
# Header
# --------------------------------------------------------

$headerOld = @'
  // Header
  header: {
    background: 'var(--color-bg-topbar, #0D2B55)',
    padding: '0 var(--space-5, 24px)',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  } as CSSProperties,
'@

$headerNew = @'
  // Header — igual al Navbar
  header: {
    background: '#0D2B55',
    padding: '0 24px',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  } as CSSProperties,

  headerAccentLine: {
    height: '2px',
    background: '#1D9E75',
    flexShrink: 0,
  } as CSSProperties,
'@

Patch-File `
    -old $headerOld `
    -new $headerNew `
    -desc "Header"

# --------------------------------------------------------
# PATCH 2
# Steps bar
# --------------------------------------------------------

$stepsBarOld = @'
  stepsBar: {
    background: 'var(--brand-secondary, #0D2B55)',
    display: 'flex',
    padding: '0 var(--space-5, 24px)',
    gap: 0,
    flexShrink: 0,
  } as CSSProperties,
'@

$stepsBarNew = @'
  stepsBar: {
    background: '#ffffff',
    borderBottom: '1px solid #C8D5E8',
    display: 'flex',
    padding: '0 24px',
    gap: 0,
    flexShrink: 0,
  } as CSSProperties,
'@

Patch-File `
    -old $stepsBarOld `
    -new $stepsBarNew `
    -desc "StepsBar"

# --------------------------------------------------------
# PATCH 3
# Step colors
# --------------------------------------------------------

$stepItemOld = @'
  stepItem: (active: boolean, done: boolean): CSSProperties => ({
    padding: '10px 16px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: active
      ? 'var(--brand-accent, #C9A84C)'
      : done
        ? 'rgba(255,255,255,0.5)'
        : 'rgba(255,255,255,0.3)',
    borderBottom: active
      ? '2px solid var(--brand-accent, #C9A84C)'
      : '2px solid transparent',
    cursor: done ? 'pointer' : 'default',
    transition: 'all 200ms ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }),
'@

$stepItemNew = @'
  stepItem: (active: boolean, done: boolean): CSSProperties => ({
    padding: '10px 16px',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: active
      ? '#1A4F9C'
      : done
        ? '#1D9E75'
        : 'rgba(0,0,0,0.3)',
    borderBottom: active
      ? '2px solid #1A4F9C'
      : '2px solid transparent',
    cursor: done ? 'pointer' : 'default',
    transition: 'all 200ms ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
  }),
'@

Patch-File `
    -old $stepItemOld `
    -new $stepItemNew `
    -desc "StepItem"

# --------------------------------------------------------
# PATCH 4
# Línea verde
# --------------------------------------------------------

$headerJsxOld = @'
      {/* ── Steps bar ── */}
      <nav style={T.stepsBar} role="navigation" aria-label="Pasos del checkout">
'@

$headerJsxNew = @'
      <div style={T.headerAccentLine} />

      {/* ── Steps bar ── */}
      <nav style={T.stepsBar} role="navigation" aria-label="Pasos del checkout">
'@

Patch-File `
    -old $headerJsxOld `
    -new $headerJsxNew `
    -desc "Header Accent"

# --------------------------------------------------------
# PATCH 5
# Layout embed
# --------------------------------------------------------

$gridOld = @'
        {step === 'cart' && (
          <div style={isMobile ? T.gridMono : T.grid}>
'@

$gridNew = @'
        {step === 'cart' && (
          <div style={(isMobile || mode === 'embed') ? T.gridMono : T.grid}>
'@

Patch-File `
    -old $gridOld `
    -new $gridNew `
    -desc "Grid embed"

# --------------------------------------------------------
# PATCH 6
# Sticky solo page
# --------------------------------------------------------

$stickyOld = @'
              <div style={{ ...T.card, position: isMobile ? 'static' : 'sticky', top: 16 }}>
'@

$stickyNew = @'
              <div style={{ ...T.card, position: (isMobile || mode === 'embed') ? 'static' : 'sticky', top: 16 }}>
'@

Patch-File `
    -old $stickyOld `
    -new $stickyNew `
    -desc "Sticky"

Write-Host ""
Write-Host "========================================="
Write-Host " Patch finalizado correctamente"
Write-Host " Archivo modificado:"
Write-Host "   $target"
Write-Host "========================================="
Write-Host ""
```
