# ============================================================
#  CORE — Deploy redirección por dominio
#  Ejecutar desde: C:\CORE\apps
#  Uso: .\deploy-redirect.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# --- Config ---
$repo     = "C:\CORE\apps\core-landing"           # ajustar si es otro path
$authForm = "$repo\components\AuthForm.tsx"        # ajustar si está en subcarpeta distinta

# ============================================================
Write-Host ""
Write-Host "CORE — Redirección por dominio" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar que existe el archivo
if (-not (Test-Path $authForm)) {
    Write-Error "No se encontró $authForm — verificá el path del repo."
    exit 1
}
Write-Host "[1/4] AuthForm.tsx encontrado OK" -ForegroundColor Green

# 2. Backup
$backup = "$authForm.bak-redirect-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item $authForm $backup
Write-Host "[2/4] Backup creado: $backup" -ForegroundColor Green

# 3. Aplicar el cambio
$content = Get-Content $authForm -Raw -Encoding UTF8

# Verificar que no fue aplicado antes
if ($content -match "DOMAIN_PORTALS") {
    Write-Host "[3/4] El cambio ya estaba aplicado — no se modifica nada." -ForegroundColor Yellow
} else {
    # Insertar mapa de dominios y función helper antes de "type View"
    $domainBlock = @"

// Mapa de dominios → portales CORE
// Para agregar un cliente nuevo, añadir una línea aquí
const DOMAIN_PORTALS: Record<string, string> = {
  'cardisan.com': 'https://cardisan.core.com.uy',
  // 'otrocliente.com': 'https://otrocliente.core.com.uy',
}

function getPortalByEmail(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase().trim()
  return domain ? (DOMAIN_PORTALS[domain] ?? null) : null
}

"@

    $content = $content -replace "type View = 'login'", ($domainBlock + "type View = 'login'")

    # Reemplazar bloque de login para agregar redirección por portal
    $oldLogin = @"
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError('Credenciales incorrectas.'); return }
        const dest = params.get('redirect') || defaultRedirect
        router.refresh()          // orden crítico: refresh antes de push
        router.push(dest)
"@

    $newLogin = @"
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError('Credenciales incorrectas.'); return }
        const portal = getPortalByEmail(email)
        if (portal) {
          window.location.href = portal
          return
        }
        const dest = params.get('redirect') || defaultRedirect
        router.refresh()          // orden crítico: refresh antes de push
        router.push(dest)
"@

    if (-not ($content -match [regex]::Escape("params.get('redirect') || defaultRedirect"))) {
        Write-Error "No se encontró el bloque de login esperado en AuthForm.tsx — el archivo puede haber cambiado. Aplicá el cambio manualmente."
        exit 1
    }

    $content = $content.Replace($oldLogin, $newLogin)
    Set-Content $authForm $content -Encoding UTF8 -NoNewline
    Write-Host "[3/4] AuthForm.tsx actualizado con redirección por dominio" -ForegroundColor Green
}

# 4. Build de verificación
Write-Host "[4/4] Verificando build de Next.js..." -ForegroundColor Cyan
Set-Location $repo
$result = & npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Error de TypeScript:" -ForegroundColor Red
    Write-Host $result
    Write-Host ""
    Write-Host "Restaurando backup..." -ForegroundColor Yellow
    Copy-Item $backup $authForm -Force
    Write-Host "Backup restaurado. No se aplicó ningún cambio." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Todo listo." -ForegroundColor Green
Write-Host ""
Write-Host "Flujo activo:" -ForegroundColor White
Write-Host "  usuario@cardisan.com  →  https://cardisan.core.com.uy" -ForegroundColor Gray
Write-Host "  cualquier otro email  →  flujo normal de CORE" -ForegroundColor Gray
Write-Host ""
Write-Host "Para agregar un cliente nuevo, editá DOMAIN_PORTALS en AuthForm.tsx" -ForegroundColor DarkCyan
Write-Host ""
