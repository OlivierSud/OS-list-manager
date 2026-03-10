@echo off
chcp 65001 > nul
title 🔗 OS List Manager — Générateur assetlinks.json
color 0B

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║          GÉNÉRATION DU FICHIER assetlinks.json               ║
echo  ║   (Supprime la barre d'URL dans l'APK TWA)                  ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Ce fichier est nécessaire pour que l'APK s'affiche en plein
echo  écran SANS barre d'URL Chrome visible.
echo.
echo  ─────────────────────────────────────────────────────────────
echo  ÉTAPE 1 : Récupération du fingerprint SHA-256 de votre APK
echo  ─────────────────────────────────────────────────────────────
echo.

REM Chercher le keystore
set "KEYSTORE_PATH=.\keystore\os-list-manager.keystore"
if not exist "%KEYSTORE_PATH%" (
    echo  ❌ Keystore introuvable. Lancez d'abord BUILD_APK.bat
    pause
    exit /b 1
)

echo  🔍 Extraction du certificat depuis le keystore...
echo  (Entrez le mot de passe du keystore quand demandé)
echo.

keytool -list -v -keystore "%KEYSTORE_PATH%" -alias oslistmanager 2>nul | findstr /i "SHA256"

echo.
echo  ─────────────────────────────────────────────────────────────
echo  ÉTAPE 2 : Génération du fichier assetlinks.json
echo  ─────────────────────────────────────────────────────────────
echo.
echo  Copiez le SHA256 affiché ci-dessus (format: AA:BB:CC:...),
echo  puis entrez-le ci-dessous (sans espaces ni deux-points) :
echo.
set /p "SHA256_RAW=  👉 Entrez le SHA256 : "

REM Formater le SHA256 avec des deux-points si nécessaire
REM (l'utilisateur peut entrer soit le format brut soit avec colons)

echo.
echo  📝 Génération du fichier assetlinks.json...

REM Créer le dossier .well-known si besoin
if not exist ".\well-known-output" mkdir "well-known-output"

(
echo [
echo   {
echo     "relation": ["delegate_permission/common.handle_all_urls"],
echo     "target": {
echo       "namespace": "android_app",
echo       "package_name": "com.oliviersud.oslistmanager",
echo       "sha256_cert_fingerprints": ["%SHA256_RAW%"]
echo     }
echo   }
echo ]
) > ".\well-known-output\assetlinks.json"

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║           ✅ FICHIER GÉNÉRÉ AVEC SUCCÈS !                   ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║  📄 Fichier : APK-android\well-known-output\assetlinks.json ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║  🚀 ACTION REQUISE :                                        ║
echo  ║  Copiez ce fichier dans votre dépôt GitHub à l'emplacement: ║
echo  ║  public/.well-known/assetlinks.json                        ║
echo  ║  puis faites un commit + push sur GitHub.                  ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║  L'URL finale sera :                                        ║
echo  ║  https://oliviersud.github.io/OS-list-manager/             ║
echo  ║  .well-known/assetlinks.json                               ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

pause
