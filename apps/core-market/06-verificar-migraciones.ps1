<#
.SYNOPSIS
  NO borra ni modifica nada. Solo lectura: ayuda a verificar contra la base
  real cual version de crear_orden_segura esta aplicada (v2 con regresiones,
  o v3 corregida) y deja a mano el query para chequear el bug de moneda.

.NOTA
  El Supabase CLI (v2.x en adelante) no tiene un subcomando para correr una
  query suelta contra la base remota (no existe "supabase db execute").
  Por eso este script usa `psql` directo con la connection string de tu
  proyecto, que es ademas la forma mas confiable de hacerlo.

.CONNECTION STRING
  La sacas de: Supabase Dashboard -> tu proyecto -> Project Settings ->
  Database -> Connection string -> pestaña "URI" (usa el modo "Session
  pooler" si estas en una red que bloquea IPv6, si no, el directo).
  Se ve asi: postgresql://postgres.xxxx:TU_PASSWORD@aws-0-xxxx.pooler.supabase.com:5432/postgres

.USAGE
  cd C:\ruta\a\core-market
  $env:SUPABASE_DB_URL = "postgresql://postgres.xxxx:...@...supabase.com:5432/postgres"
  .\06-verificar-migraciones.ps1

  # o pasandola directo:
  .\06-verificar-migraciones.ps1 -ConnectionString "postgresql://..."
#>

param(
    [string]$ConnectionString = $env:SUPABASE_DB_URL
)

$ErrorActionPreference = "Stop"

$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "No encontre 'psql' en el PATH." -ForegroundColor Red
    Write-Host "Instalalo con 'winget install PostgreSQL.PostgreSQL' (trae psql) o desde postgresql.org," -ForegroundColor Yellow
    Write-Host "o si preferis, corre el query de abajo a mano en el SQL Editor del dashboard de Supabase." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "select pg_get_functiondef('crear_orden_segura'::regproc);" -ForegroundColor White
    exit 1
}

if (-not $ConnectionString) {
    Write-Host "Falta la connection string." -ForegroundColor Red
    Write-Host 'Definila con: $env:SUPABASE_DB_URL = "postgresql://..."' -ForegroundColor Yellow
    Write-Host "o pasala con -ConnectionString. Ver la seccion .CONNECTION STRING de este script (Get-Help .\06-verificar-migraciones.ps1 -Full)." -ForegroundColor Yellow
    exit 1
}

Write-Host "Consultando la definicion real de crear_orden_segura en la base..." -ForegroundColor Cyan

$query = "select pg_get_functiondef('crear_orden_segura'::regproc);"
$resultado = & psql $ConnectionString -t -c $query 2>&1
$resultadoTexto = $resultado -join "`n"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "psql devolvio un error. Revisa la connection string / password / red:" -ForegroundColor Red
    Write-Host $resultadoTexto
    exit 1
}

Write-Host ""
Write-Host "--- Definicion actual en la base ---" -ForegroundColor Cyan
Write-Host $resultadoTexto

Write-Host ""
Write-Host "Chequeo rapido de senales de v2 (con regresiones) vs v3 (corregida):" -ForegroundColor Cyan
if ($resultadoTexto -match "productos_secondhand") {
    Write-Host "  OK: la funcion SI contempla productos_secondhand -> parece v3 (correcta)." -ForegroundColor Green
} elseif ($resultadoTexto.Trim().Length -eq 0) {
    Write-Host "  No vino contenido en la respuesta. Revisa que la connection string apunte al proyecto correcto." -ForegroundColor Red
} else {
    Write-Host "  ALERTA: no aparece 'productos_secondhand' -> podria seguir siendo v2 (con la regresion)." -ForegroundColor Red
    Write-Host "  Si es asi, correr migrations\20260704_crear_orden_segura_v3.sql (backup de 'ordenes' primero)." -ForegroundColor Yellow
}

if ($resultadoTexto -match "stock_ilimitado") {
    Write-Host "  ALERTA: aparece 'stock_ilimitado', columna que segun el README no existe en la tabla real." -ForegroundColor Red
}

Write-Host ""
Write-Host "--- Bug de moneda (USD vs UYU) pendiente segun README.md ---" -ForegroundColor Cyan
Write-Host "Para confirmar si hay ordenes ya mal cobradas, corre (este si toca datos reales, se muestra pero no se ejecuta solo):"
Write-Host @"

  select id, moneda, total_uyu, total_usd, mp_payment_id, created_at
  from ordenes
  where moneda = 'USD'
  order by created_at desc
  limit 50;

"@ -ForegroundColor White

$correr = Read-Host "Queres que corra ese query de ordenes en USD ahora? (SI para correrlo)"
if ($correr -eq "SI") {
    $queryOrdenes = "select id, moneda, total_uyu, total_usd, mp_payment_id, created_at from ordenes where moneda = 'USD' order by created_at desc limit 50;"
    & psql $ConnectionString -c $queryOrdenes
}
