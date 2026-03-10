@echo off
chcp 65001 > nul
title 📱 OS List Manager — Lancer le Build APK sur GitHub
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║        OS LIST MANAGER — BUILD APK ANDROID                  ║
echo  ║   (Build dans le cloud via GitHub Actions)                  ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  ✅ Aucune installation requise !
echo  ✅ Le build se fait entièrement sur les serveurs de GitHub.
echo.
echo  ──────────────────────────────────────────────────────────────
echo   MÉTHODE 1 (Recommandée) — GitHub Actions (Automatique)
echo  ──────────────────────────────────────────────────────────────
echo.
echo  ÉTAPE 1 : Pousser ce dossier sur GitHub
echo  ─────────────────────────────────────────
echo.
echo  Si vous n'avez pas encore commité ces fichiers, ouvrez un
echo  terminal dans le dossier du projet et exécutez :
echo.
echo     git add .github/workflows/build-apk.yml
echo     git add APK-android/
echo     git commit -m "feat: add Android APK build workflow"
echo     git push
echo.
echo  ÉTAPE 2 : Déclencher le build sur GitHub
echo  ──────────────────────────────────────────
echo.
echo  Appuyez sur une touche pour ouvrir GitHub Actions dans votre
echo  navigateur, puis :
echo.
echo   1. Cliquez sur "📱 Build APK Android (TWA)" dans la liste
echo   2. Cliquez sur le bouton "Run workflow" (à droite)
echo   3. Choisissez la version (ex: 1.0.0) et cliquez "Run workflow"
echo   4. Attendez ~5 minutes que le build se termine
echo   5. Cliquez sur le build terminé
echo   6. Téléchargez le fichier ZIP dans la section "Artifacts"
echo   7. Extrayez l'APK du ZIP
echo.
pause

start "" "https://github.com/OlivierSud/OS-list-manager/actions"

echo.
echo  ──────────────────────────────────────────────────────────────
echo   MÉTHODE 2 — PWABuilder (Sans workflow, directement en ligne)
echo  ──────────────────────────────────────────────────────────────
echo.
echo  C'est le moyen le PLUS SIMPLE : un site web Microsoft qui
echo  génère l'APK directement depuis l'URL de votre PWA.
echo.
echo  Appuyez sur une touche pour ouvrir PWABuilder avec votre URL...
echo.
pause

start "" "https://www.pwabuilder.com/reportcard?site=https://oliviersud.github.io/OS-list-manager"

echo.
echo  Sur PWABuilder :
echo   1. Attendez l'analyse de votre PWA
echo   2. Cliquez sur "Package for stores"
echo   3. Choisissez "Android"
echo   4. Cliquez "Download Package"
echo   5. Extrayez le ZIP → votre APK est dedans !
echo.
echo  ──────────────────────────────────────────────────────────────
echo   INSTALLATION SUR ANDROID
echo  ──────────────────────────────────────────────────────────────
echo.
echo   1. Copiez l'APK sur votre téléphone (USB, Google Drive...)
echo   2. Paramètres → Sécurité → Sources inconnues → Activer
echo   3. Ouvrez le fichier APK depuis votre explorateur
echo   4. Appuyez sur "Installer"
echo.
pause
