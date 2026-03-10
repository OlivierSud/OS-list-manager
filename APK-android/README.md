# 📱 APK Android — OS List Manager

Ce dossier contient tout le nécessaire pour générer l'APK Android de l'application
**OS List Manager** via la méthode **TWA (Trusted Web Activity)**.

> ⚠️ **Aucun fichier existant du projet n'a été modifié.**
> Ce dossier est totalement indépendant du reste de l'application.

> ✅ **Aucune installation requise** (Android Studio, SDK...).
> Le build se fait entièrement dans le cloud via GitHub Actions.

---

## 🗂️ Structure du dossier

```
APK-android/
├── BUILD_APK.bat        ← Double-cliquez ici — ouvre GitHub Actions + PWABuilder
├── twa-config.json      ← Configuration TWA (URL, couleurs, package ID...)
├── README.md            ← Ce fichier
└── .gitignore           ← Exclut les fichiers de build temporaires

.github/workflows/
└── build-apk.yml        ← Workflow GitHub Actions pour le build automatique
```

---

## 🚀 Méthodes pour générer l'APK

### ⭐ Méthode 1 — GitHub Actions (Recommandée)

**Zéro installation. Build automatique dans le cloud.**

#### Étape 1 — Pousser le workflow sur GitHub

```bash
git add .github/workflows/build-apk.yml APK-android/
git commit -m "feat: add Android APK build workflow"
git push
```

#### Étape 2 — Déclencher le build

1. Allez sur : **[github.com/OlivierSud/OS-list-manager/actions](https://github.com/OlivierSud/OS-list-manager/actions)**
2. Cliquez sur **"📱 Build APK Android (TWA)"** dans la liste de gauche
3. Cliquez sur le bouton **"Run workflow"** (bouton gris à droite)
4. Entrez la version (ex: `1.0.0`) → cliquez **"Run workflow"**

#### Étape 3 — Télécharger l'APK

1. Attendez ~5 minutes (le workflow est en cours)
2. Cliquez sur le build terminé (✅ vert)
3. En bas de la page : section **"Artifacts"**
4. Cliquez sur **"OS-List-Manager-APK-v1.0.0"** pour télécharger le ZIP
5. Extrayez le ZIP → votre fichier `.apk` est dedans !

```
📦 GitHub Actions
└── ✅ Build APK Android (TWA)
    └── Artifacts
        └── OS-List-Manager-APK-v1.0.0.zip
            └── OS-List-Manager-v1.0.0.apk  ← Votre APK !
```

---

### 🌐 Méthode 2 — PWABuilder (La plus simple, site web Microsoft)

**Aucune installation, aucun commit. Juste un navigateur.**

1. Allez sur : **[pwabuilder.com](https://www.pwabuilder.com/reportcard?site=https://oliviersud.github.io/OS-list-manager)**
2. Attendez l'analyse de votre PWA
3. Cliquez **"Package for stores"**
4. Choisissez **"Android"**
5. Cliquez **"Download Package"**
6. Extrayez le ZIP → votre APK est dedans !

> ℹ️ PWABuilder génère automatiquement un APK TWA depuis votre URL PWA.
> Pas besoin de configurer quoi que ce soit !

---

## 📲 Installer l'APK sur votre téléphone Android

1. **Copiez** l'APK sur votre téléphone (USB, Google Drive, email...)
2. Sur Android : **Paramètres → Sécurité → Sources inconnues → Activer**
   *(ou "Installer des apps inconnues" selon la version Android)*
3. **Ouvrez** le fichier APK depuis votre explorateur de fichiers
4. Appuyez sur **Installer**

---

## 🌐 Comment fonctionne le TWA ?

```
┌─────────────────────┐          ┌──────────────────────────────────────┐
│   APK Android       │  HTTPS   │  GitHub Pages                        │
│  (enveloppe native) │ ───────► │  oliviersud.github.io/OS-list-manager│
│  ~2-5 Mo            │          │  (votre vraie app PWA)               │
└─────────────────────┘          └──────────────────────────────────────┘
```

- L'APK est **très léger** car il ne contient pas le code de l'app
- Il affiche votre **PWA sur GitHub Pages** sans barre de navigation Chrome
- **Chaque mise à jour** de l'app est automatiquement reflétée dans l'APK
- **Supabase fonctionne exactement pareil** — mêmes origines, mêmes autorisations

---

## 🔄 Après une mise à jour de l'app

Bonne nouvelle : **vous n'avez PAS besoin de rebuilder l'APK** à chaque modification !

L'APK TWA charge toujours la dernière version de votre site GitHub Pages.
Poussez simplement votre code sur `main` comme d'habitude → l'app Android se met à jour automatiquement.

Vous devez rebuilder l'APK **uniquement si** vous changez :
- Le nom ou package de l'app
- Les icônes ou couleurs de thème
- La version affichée dans le store
