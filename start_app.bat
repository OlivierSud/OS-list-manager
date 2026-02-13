@echo off
echo Lancement de OS List Manager...
echo Le serveur va demarrer sur http://localhost:8010
echo Vous pouvez fermer cette fenetre pour arreter le serveur.

REM Ouvre le navigateur par defaut
start http://localhost:8010

REM Lance le serveur Python simple sur le port 8010
python -m http.server 8010
pause
