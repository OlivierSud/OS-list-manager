@echo off
chcp 65001 > nul
title 🍎 OS List Manager — Options iOS
color 0C

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║        OS LIST MANAGER — INSTALLATION SUR iOS               ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
echo  ┌──────────────────────────────────────────────────────────────┐
echo  │  ⚠️  IMPORTANT : iOS est différent d'Android                 │
echo  │                                                              │
echo  │  Apple ne permet pas d'installer une app en dehors           │
echo  │  de l'App Store sans un compte développeur payant (99$/an). │
echo  │                                                              │
echo  │  BONNE NOUVELLE : Votre app est déjà une PWA !              │
echo  │  iPhone peut l'installer GRATUITEMENT via Safari.           │
echo  └──────────────────────────────────────────────────────────────┘
echo.
echo  ══════════════════════════════════════════════════════════════
echo   OPTION 1 ⭐ (Gratuite - Fonctionne aujourd'hui)
echo   PWA via Safari — Installation sur l'écran d'accueil iPhone
echo  ══════════════════════════════════════════════════════════════
echo.
echo  Sur votre iPhone :
echo   1. Ouvrez Safari (pas Chrome, pas Firefox — uniquement Safari)
echo   2. Allez sur :
echo.
echo      https://oliviersud.github.io/OS-list-manager
echo.
echo   3. Appuyez sur le bouton Partager (carré avec flèche vers le haut)
echo   4. Faites défiler et appuyez sur "Sur l'écran d'accueil"
echo   5. Appuyez sur "Ajouter"
echo.
echo   ✅ L'app apparaît sur votre écran d'accueil comme une vraie app !
echo   ✅ S'ouvre en plein écran (sans barre Safari)
echo   ✅ Icône et nom personnalisés
echo   ✅ Fonctionne sans connexion (Service Worker actif)
echo.
echo  Appuyez sur une touche pour ouvrir le guide Apple sur votre PC...
pause > nul
start "" "https://support.apple.com/fr-fr/guide/iphone/iph42ab2f3a7/ios"

echo.
echo  ══════════════════════════════════════════════════════════════
echo   OPTION 2 (Compte Apple Developer requis — 99$/an)
echo   IPA via GitHub Actions + App Store / TestFlight
echo  ══════════════════════════════════════════════════════════════
echo.
echo  Si vous avez un compte Apple Developer :
echo   1. Le workflow .github/workflows/build-ios.yml est préconfiguré
echo   2. Configurez vos certificats dans les Secrets GitHub
echo   3. Distribuez via TestFlight (bêta) ou l'App Store
echo.
echo  👉 Voir APK-android/README-IOS.md pour le guide complet
echo.
echo  Appuyez sur une touche pour ouvrir la page Apple Developer...
pause > nul
start "" "https://developer.apple.com/programs/"

echo.
echo  ══════════════════════════════════════════════════════════════
echo   OPTION 3 (Sans compte Apple, mais nécessite un Mac)
echo   PWABuilder → Projet Xcode
echo  ══════════════════════════════════════════════════════════════
echo.
echo  PWABuilder peut générer un projet Xcode depuis votre PWA.
echo  Mais la compilation en IPA requiert obligatoirement un Mac
echo  avec Xcode installé.
echo.
echo  Appuyez sur une touche pour ouvrir PWABuilder...
pause > nul
start "" "https://www.pwabuilder.com/reportcard?site=https://oliviersud.github.io/OS-list-manager"

echo.
echo  ══════════════════════════════════════════════════════════════
echo.
echo  📌 RECOMMANDATION : Utilisez l'Option 1 (Safari + PWA).
echo     C'est gratuit, immédiat, et votre app est déjà parfaitement
echo     configurée pour fonctionner en mode PWA sur iOS !
echo.
pause
