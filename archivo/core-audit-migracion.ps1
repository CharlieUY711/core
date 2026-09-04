<#
  CORE - AUDITORIA DE MIGRACION DE NOMBRES (SOLO LECTURA)
  Workspace : HUB / Desarrollo  ->  Workspace
  Marketing : Presentaciones     ->  Marketing
  No modifica nada. Solo escanea y genera un reporte.
#>
param(
  [string]$Root    = "C:\CORE",
  [string]$OutFile = "$env:USERPROFILE\Desktop\core-migration-audit.txt"
)
$ErrorActionPreference = "Stop"

$excludeDirs = @('\.git\','\node_modules\','\.next\','\dist\','\build\','\.turbo\','\out\','\coverage\','\.vercel\')
$textExt = @('.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.md','.mdx','.css','.scss','.sass','.html','.svg','.txt','.yml','.yaml','.toml','.env','.ps1','.sh','.xml','.csv')
$textNames = @('.env','.env.local','.env.development','.env.production','.gitmodules','.npmrc','readme')
$nameRegex = '(?i)(?<!git)hub|desarrollo|presentacion'

function Test-Excluded([string]$p){ foreach($d in $excludeDirs){ if($p -match [regex]::Escape($d)){ return $true } } return $false }
$report = New-Object System.Collections.Generic.List[string]
function W($s){ $report.Add($s) | Out-Null; Write-Host $s }

W "================================================================"
W " CORE - AUDITORIA DE MIGRACION DE NOMBRES (solo lectura)"
W " Root : $Root"
W " Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
W "================================================================"

W "`n## 1. CARPETAS con nombre a revisar ##"
Get-ChildItem -Path $Root -Recurse -Directory -ErrorAction SilentlyContinue |
  Where-Object { -not (Test-Excluded $_.FullName) -and $_.Name -match $nameRegex } |
  ForEach-Object { W ("  DIR   " + $_.FullName) }

W "`n## 2. ARCHIVOS con nombre a revisar ##"
Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { -not (Test-Excluded $_.FullName) -and $_.Name -match $nameRegex } |
  ForEach-Object { W ("  FILE  " + $_.FullName) }

W "`n## 3. OCURRENCIAS EN CONTENIDO ##"
$files = Get-ChildItem -Path $Root -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object { -not (Test-Excluded $_.FullName) -and ( $textExt -contains $_.Extension.ToLower() -or $textNames -contains $_.Name.ToLower() ) }

$counts = [ordered]@{ 'core-hub'=0; 'hub'=0; 'desarrollo'=0; 'core-presentaciones'=0; 'presentaciones'=0 }
foreach($f in $files){
  try { $lines = Get-Content -LiteralPath $f.FullName -ErrorAction Stop } catch { continue }
  $ln = 0
  foreach($line in $lines){
    $ln++; $t = $line.Trim()
    if($line -match '(?i)core-hub'){ W ("  [core-hub]            {0}:{1}  {2}" -f $f.FullName,$ln,$t); $counts['core-hub']++ }
    elseif($line -match '(?i)(?<!git)hub'){ W ("  [hub]                 {0}:{1}  {2}" -f $f.FullName,$ln,$t); $counts['hub']++ }
    if($line -match '(?i)desarrollo'){ W ("  [desarrollo]          {0}:{1}  {2}" -f $f.FullName,$ln,$t); $counts['desarrollo']++ }
    if($line -match '(?i)core-presentaciones'){ W ("  [core-presentaciones] {0}:{1}  {2}" -f $f.FullName,$ln,$t); $counts['core-presentaciones']++ }
    elseif($line -match '(?i)presentacion'){ W ("  [presentaciones]      {0}:{1}  {2}" -f $f.FullName,$ln,$t); $counts['presentaciones']++ }
  }
}

W "`n## RESUMEN DE OCURRENCIAS EN CONTENIDO ##"
foreach($k in $counts.Keys){ W ("  {0,-22} {1}" -f $k, $counts[$k]) }
W "`n>> COLISIONES A REVISAR (NO renombrar a ciegas):"
W "   - 'desarrollo' como estado de UI ('En desarrollo', status_dev) = WIP, NO migrar."
W "   - 'presentaciones' en descripciones ('...decks, presentaciones...') = sustantivo, NO migrar."

$report | Set-Content -LiteralPath $OutFile -Encoding UTF8
W "`nOK: reporte guardado en: $OutFile"
