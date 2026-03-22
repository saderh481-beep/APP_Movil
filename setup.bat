@echo off
chcp 65001 >nul
echo.
echo ================================================
echo  SADERH App - Instalador v4 (Expo 55 exacto)
echo  Gobierno del Estado de Hidalgo
echo ================================================
echo.
node -v >nul 2>&1
if %errorlevel% neq 0 ( echo [ERROR] Instala Node.js desde nodejs.org & pause & exit /b 1 )
echo [OK] Node: & node -v
echo.

echo [LIMPIANDO] Borrando node_modules, cache y .expo...
if exist node_modules   rmdir /s /q node_modules   2>nul
if exist package-lock.json del /f /q package-lock.json 2>nul
if exist .expo          rmdir /s /q .expo           2>nul
echo [OK] Limpieza completa
echo.

echo [INSTALANDO] Esto puede tardar 3-5 minutos...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo Reintentando con --force...
    call npm install --legacy-peer-deps --force
)
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion.
    pause & exit /b 1
)
echo.
echo ================================================
echo  LISTO. Para iniciar ejecuta:
echo.
echo    npx expo start --clear
echo.
echo  Escanea el QR con Expo Go
echo  Login demo: 00000
echo ================================================
echo.
pause
