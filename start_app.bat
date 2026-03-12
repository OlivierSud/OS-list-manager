@echo off
setlocal enabledelayedexpansion

echo ===========================================
echo    LANCEMENT OS LIST MANAGER
echo ===========================================

:: Verification simple de node
node -v >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Node.js est introuvable.
    echo 1. Verifiez que vous l'avez installe sur nodejs.org
    echo 2. Si c'est deja fait, REDEMARREZ votre PC.
    echo.
    pause
    exit /b
)

:: Recuperation de l'IP pour le mobile
set "MYIP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=*" %%b in ("%%a") do set "MYIP=%%b"
)
set "MYIP=%MYIP: =%"

echo [OK] Node.js detecte.
echo [OK] IP de votre PC : %MYIP%
echo.
echo -------------------------------------------
echo Liens d'acces :
echo Local  : http://localhost:5173
echo Mobile : http://%MYIP%:5173
echo -------------------------------------------
echo.

:: Installation des modules si absent
if not exist node_modules (
    echo [INFO] Premier lancement, installation des modules...
    call npm install
)

:: Lancement de Vite
echo [LANCEMENT] npm run dev...
call npm run dev

echo.
echo Le serveur s'est arrete.
pause
