@echo off
chcp 65001 > nul
title CORE TOOLS – Dev App Setup

echo.
echo ==========================================
echo   CORE TOOLS - Dev App Setup
echo ==========================================
echo.

set APP=core-tools-dev
set GEO=core-geo
set PERFIL=core-perfil

:: Verificar que existen los widgets
if not exist "..\%PERFIL%\UserProfile.tsx" (
    echo ERROR: No se encontro ..\%PERFIL%\UserProfile.tsx
    echo Asegurate de ejecutar este .bat desde C:\CORE\tools\
    pause & exit /b 1
)
if not exist "..\%GEO%\AddressGeo.tsx" (
    echo ERROR: No se encontro ..\%GEO%\AddressGeo.tsx
    echo Asegurate de ejecutar este .bat desde C:\CORE\tools\
    pause & exit /b 1
)

echo [1/6] Creando proyecto Vite + React + TypeScript...
call npm create vite@latest %APP% -- --template react-ts
if errorlevel 1 ( echo ERROR en Vite & pause & exit /b 1 )

cd %APP%

echo.
echo [2/6] Instalando dependencias...
call npm install
call npm install mapbox-gl
call npm install -D @types/mapbox-gl

echo.
echo [3/6] Copiando widgets...
if not exist src\widgets mkdir src\widgets
copy "..\%PERFIL%\UserProfile.tsx" "src\widgets\UserProfile.tsx" > nul && echo     OK UserProfile.tsx
copy "..\%GEO%\AddressGeo.tsx"     "src\widgets\AddressGeo.tsx"  > nul && echo     OK AddressGeo.tsx

echo.
echo [4/6] Copiando App.tsx de demo...
if exist "..\App.demo.tsx" (
    copy "..\App.demo.tsx" "src\App.tsx" > nul && echo     OK App.tsx
) else (
    echo     AVISO: no se encontro App.demo.tsx, conservando el App.tsx de Vite
)

echo.
echo [5/6] Creando .env.local...
echo VITE_MAPBOX_TOKEN=TU_TOKEN_MAPBOX_AQUI> .env.local
echo     OK .env.local

echo.
echo [6/6] Limpiando boilerplate...
if exist src\App.css del src\App.css > nul
echo *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}> src\index.css
echo body{font-family:system-ui,sans-serif;background:#F5F5F7}>> src\index.css

echo.
echo ==========================================
echo   Todo listo!
echo ==========================================
echo.
echo   IMPORTANTE: antes de usar el mapa edita:
echo   %APP%\.env.local
echo   y reemplaza TU_TOKEN_MAPBOX_AQUI con tu token de:
echo   https://account.mapbox.com/
echo.
echo Arrancando servidor en http://localhost:5173 ...
echo.
call npm run dev
