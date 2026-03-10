@echo off
setlocal enabledelayedexpansion

:: Détermine l'adresse IP locale (pour l'affichage)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    set IP=!IP: =!
)

echo.
echo ========================================================
echo          Lancement de OS List Manager
echo ========================================================
echo.
echo  Serveur Local : http://localhost:8010
if not "%IP%"=="" (
    echo  Serveur Reseau (Mobile) : http://%IP%:8010
)
echo.
echo  NOTE : Pour acceder a l'app depuis votre mobile :
echo  1. Vos deux appareils doivent etre sur le meme Wi-Fi.
echo  2. Utilisez l'adresse 'http://%IP%:8010' sur votre mobile.
echo  (N'utilisez PAS 'localhost' sur votre telephone !)
echo.
echo  Vous pouvez fermer cette fenetre pour arreter le serveur.
echo ========================================================
echo.

REM Ouvre le navigateur par defaut sur PC
start http://localhost:8010

REM Lance le serveur Python simple sur le port 8010
python -m http.server 8010
pause
