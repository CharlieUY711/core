# =====================================================================
# verify-bep-status.ps1
# Verifica el estado real del monorepo CORE / app core-bep sin modificar nada.
# Corré esto desde cualquier ubicación.
# =====================================================================

Write-Host ""
Write-Host "=== 1. ESTRUCTURA DE CARPETAS ===" -ForegroundColor Cyan

$coreBepPath = "C:\CORE\apps\core-bep"
if (Test-Path -LiteralPath $coreBepPath) {
    Write-Host "OK   - apps\core-bep existe" -ForegroundColor Green
} else {
    Write-Host "FALTA - apps\core-bep NO existe en C:\CORE\apps" -ForegroundColor Red
}

$bepConfigPath = "C:\CORE\packages\bep-config"
$bepSupabasePath = "C:\CORE\packages\bep-supabase"
if (Test-Path -LiteralPath $bepConfigPath) {
    Write-Host "OK   - packages\bep-config existe" -ForegroundColor Green
} else {
    Write-Host "FALTA - packages\bep-config NO existe" -ForegroundColor Red
}
if (Test-Path -LiteralPath $bepSupabasePath) {
    Write-Host "OK   - packages\bep-supabase existe" -ForegroundColor Green
} else {
    Write-Host "FALTA - packages\bep-supabase NO existe" -ForegroundColor Red
}

$leftoverPath = "C:\CORE\apps\BEP"
if (Test-Path -LiteralPath $leftoverPath) {
    Write-Host "AVISO - C:\CORE\apps\BEP (carpeta de descarga original) todavia existe - se puede borrar una vez confirmado que todo funciona" -ForegroundColor Yellow
} else {
    Write-Host "OK   - C:\CORE\apps\BEP (carpeta temporal) ya fue limpiada" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== 2. REFERENCIAS DE PACKAGE.JSON (nombres correctos) ===" -ForegroundColor Cyan

if (Test-Path -LiteralPath "$bepConfigPath\package.json") {
    $content = Get-Content -LiteralPath "$bepConfigPath\package.json" -Raw
    if ($content -match '"name":\s*"@core/bep-config"') {
        Write-Host "OK   - bep-config/package.json tiene el nombre correcto (@core/bep-config)" -ForegroundColor Green
    } else {
        Write-Host "REVISAR - bep-config/package.json NO tiene el nombre @core/bep-config" -ForegroundColor Red
        Write-Host "          Contenido actual del campo name:" -ForegroundColor Yellow
        $content | Select-String '"name":\s*"[^"]+"'
    }
}

if (Test-Path -LiteralPath "$bepSupabasePath\package.json") {
    $content = Get-Content -LiteralPath "$bepSupabasePath\package.json" -Raw
    if ($content -match '"name":\s*"@core/bep-supabase"') {
        Write-Host "OK   - bep-supabase/package.json tiene el nombre correcto (@core/bep-supabase)" -ForegroundColor Green
    } else {
        Write-Host "REVISAR - bep-supabase/package.json NO tiene el nombre @core/bep-supabase" -ForegroundColor Red
        $content | Select-String '"name":\s*"[^"]+"'
    }
}

if (Test-Path -LiteralPath "$coreBepPath\package.json") {
    $content = Get-Content -LiteralPath "$coreBepPath\package.json" -Raw
    $hasOldSupabase = $content -match '"@core/supabase"'
    $hasOldConfig   = $content -match '"@core/config"'
    $hasNewSupabase = $content -match '"@core/bep-supabase"'
    $hasNewConfig   = $content -match '"@core/bep-config"'

    if ($hasNewSupabase -and $hasNewConfig -and -not $hasOldSupabase -and -not $hasOldConfig) {
        Write-Host "OK   - core-bep/package.json ya referencia @core/bep-supabase y @core/bep-config" -ForegroundColor Green
    } else {
        Write-Host "REVISAR - core-bep/package.json todavia tiene referencias viejas o incompletas:" -ForegroundColor Red
        $content | Select-String '"@core/[a-z-]+"'
    }
}

Write-Host ""
Write-Host "=== 3. IMPORTS VIEJOS DENTRO DEL CODIGO FUENTE ===" -ForegroundColor Cyan

if (Test-Path -LiteralPath "$coreBepPath\src") {
    $oldImports = Get-ChildItem "$coreBepPath\src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
        Select-String -Pattern '@core/supabase["'']|@core/config["'']' -List

    if ($oldImports.Count -eq 0) {
        Write-Host "OK   - No quedan imports viejos (@core/supabase o @core/config) en src/" -ForegroundColor Green
    } else {
        Write-Host "REVISAR - Quedan $($oldImports.Count) archivo(s) con imports viejos:" -ForegroundColor Red
        $oldImports | ForEach-Object { Write-Host "          $($_.Path)" -ForegroundColor Yellow }
    }
} else {
    Write-Host "AVISO - No se encontro $coreBepPath\src" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 4. NODE_MODULES / INSTALACION ===" -ForegroundColor Cyan

if (Test-Path -LiteralPath "C:\CORE\node_modules") {
    Write-Host "OK   - C:\CORE\node_modules existe (se corrio pnpm install al menos una vez)" -ForegroundColor Green
} else {
    Write-Host "FALTA - C:\CORE\node_modules NO existe - pnpm install no se corrio nunca a nivel raiz" -ForegroundColor Red
}

if (Test-Path -LiteralPath "$coreBepPath\node_modules") {
    Write-Host "OK   - core-bep tiene node_modules propio" -ForegroundColor Green
} elseif (Test-Path -LiteralPath "C:\CORE\node_modules\.pnpm") {
    Write-Host "OK   - node_modules es hoisted via pnpm workspace (normal, no es un problema)" -ForegroundColor Green
} else {
    Write-Host "AVISO - core-bep no parece tener dependencias instaladas" -ForegroundColor Yellow
}

# Verifica si hay un .next (evidencia de que corrio el dev server o build al menos una vez)
if (Test-Path -LiteralPath "$coreBepPath\.next") {
    Write-Host "OK   - existe carpeta .next en core-bep -> el dev server o build corrio en algun momento" -ForegroundColor Green
} else {
    Write-Host "AVISO - no hay carpeta .next -> no hay evidencia de que el server haya corrido todavia" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 5. GIT: REMOTE Y PUSH ===" -ForegroundColor Cyan

Push-Location "C:\CORE"
try {
    $remotes = git remote -v 2>&1
    if ($LASTEXITCODE -eq 0 -and $remotes) {
        Write-Host "OK   - Remotes configurados:" -ForegroundColor Green
        $remotes | ForEach-Object { Write-Host "          $_" -ForegroundColor Gray }
    } else {
        Write-Host "FALTA - No hay ningun remote configurado en C:\CORE" -ForegroundColor Red
    }

    Write-Host ""
    $branch = git branch --show-current 2>&1
    Write-Host "Rama actual: $branch" -ForegroundColor Gray

    $status = git status -s 2>&1
    if ($status) {
        Write-Host "AVISO - Hay cambios sin commitear:" -ForegroundColor Yellow
        $status | Select-Object -First 10 | ForEach-Object { Write-Host "          $_" -ForegroundColor Gray }
        $totalChanges = ($status | Measure-Object).Count
        if ($totalChanges -gt 10) {
            Write-Host "          ... y $($totalChanges - 10) mas" -ForegroundColor Gray
        }
    } else {
        Write-Host "OK   - No hay cambios pendientes de commit (working tree limpio)" -ForegroundColor Green
    }

    Write-Host ""
    # Compara con el remoto si existe
    if ($remotes) {
        git fetch 2>&1 | Out-Null
        $ahead = git rev-list --count '@{u}..HEAD' 2>&1
        $behind = git rev-list --count 'HEAD..@{u}' 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Commits locales sin pushear: $ahead" -ForegroundColor Gray
            Write-Host "Commits remotos no traidos:  $behind" -ForegroundColor Gray
            if ($ahead -eq "0") {
                Write-Host "OK   - Todo lo local esta pusheado al remoto" -ForegroundColor Green
            } else {
                Write-Host "PENDIENTE - Hay $ahead commit(s) local(es) sin pushear" -ForegroundColor Red
            }
        } else {
            Write-Host "AVISO - No se pudo comparar con upstream (la rama no tiene tracking configurado, o el push nunca se hizo)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "ERROR - No se pudo leer el estado de git: $_" -ForegroundColor Red
}
Pop-Location

Write-Host ""
Write-Host "=== 6. ENV VARS DE core-bep ===" -ForegroundColor Cyan

$envLocalPath = "$coreBepPath\.env.local"
if (Test-Path -LiteralPath $envLocalPath) {
    Write-Host "OK   - .env.local existe en core-bep" -ForegroundColor Green
    $envContent = Get-Content -LiteralPath $envLocalPath -Raw

    $varsToCheck = @(
        "NEXT_PUBLIC_BEP_SUPABASE_URL",
        "NEXT_PUBLIC_BEP_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY"
    )
    foreach ($v in $varsToCheck) {
        if ($envContent -match "$v\s*=\s*\S+") {
            Write-Host "       OK   - $v esta seteada" -ForegroundColor Green
        } else {
            Write-Host "       FALTA - $v no esta seteada o esta vacia" -ForegroundColor Red
        }
    }
} else {
    Write-Host "FALTA - .env.local NO existe en core-bep (usar .env.example como base)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== RESUMEN ===" -ForegroundColor Cyan
Write-Host "Revisa arriba cualquier linea en ROJO (FALTA/REVISAR/PENDIENTE) - son los puntos que" -ForegroundColor Gray
Write-Host "quedaron incompletos de la migracion al monorepo. Las lineas en AMARILLO son avisos," -ForegroundColor Gray
Write-Host "no bloquean nada pero vale la pena confirmarlos." -ForegroundColor Gray
Write-Host ""
