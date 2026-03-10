@echo off
setlocal enabledelayedexpansion

:: Détermine l'adresse IP locale
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    set IP=!IP: =!
)

echo.
echo ========================================================
echo          Lancement de OS List Manager (Vite)
echo ========================================================
echo.
echo  Serveur Local : http://localhost:5173
if not "%IP%"=="" (
    echo  Serveur Reseau (Mobile) : http://%IP%:5173
)
echo.
echo  NOTE : Pour la connexion mobile, utilisez l'adresse IP.
echo ========================================================
echo.

REM Lance le serveur de développement Vite
npm run dev
pause
