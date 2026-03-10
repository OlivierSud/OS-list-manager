# 📋 OS List Manager

**OS List Manager** est une application web moderne conçue pour simplifier la gestion de vos listes de tâches, de courses ou de projets. Elle offre une expérience utilisateur premium avec des animations dynamiques, une synchronisation en temps réel et un fonctionnement hors ligne.

🌐 **Application en ligne** : [oliviersud.github.io/OS-list-manager](https://oliviersud.github.io/OS-list-manager)

---

## ✨ Fonctionnalités

### 🎨 Design & Expérience
- **Interface sombre & élégante** — esthétique "Blender-style" avec accents orange vibrants
- **Animations fluides** — barre de progression avec étincelles, explosion de suppression, confettis à 100%
- **Effets sonores** — sons de validation, suppression et completion de liste
- **Drag & Drop** — réorganisation intuitive des éléments et sections

### 🏗️ Organisation
- **Sections & sous-sections** — structurez vos listes avec des en-têtes escamotables
- **Filtres de vue** — basculez entre "Tout", "Actifs" et "Terminés"
- **Recherche instantanée** — retrouvez n'importe quel élément en temps réel
- **Multi-listes** — créez et personnalisez autant de listes que nécessaire avec codes couleurs

### 👥 Collaboration
- **Partage de listes** — invitez des collaborateurs par email
- **Gestion des accès** — les propriétaires peuvent retirer des collaborateurs, les membres peuvent quitter une liste
- **Synchronisation temps réel** — toutes les modifications sont visibles instantanément sur tous les appareils

### ☁️ Cloud & Hors-ligne
- **Synchronisation automatique** — données sauvegardées via Supabase
- **PWA (Progressive Web App)** — fonctionne hors ligne grâce au Service Worker
- **Multi-appareils** — retrouvez vos listes sur tous vos appareils connectés

---

## 📱 Installation sur mobile (Android & iOS)

L'application est une **PWA** — elle s'installe directement depuis le navigateur, sans passer par un store.

### Android
1. Ouvrez [l'application](https://oliviersud.github.io/OS-list-manager) dans **Chrome**
2. Appuyez sur les **trois points** (menu) → **"Ajouter à l'écran d'accueil"**
3. Appuyez sur **"Installer"**

### iPhone / iPad
1. Ouvrez [l'application](https://oliviersud.github.io/OS-list-manager) dans **Safari** *(uniquement Safari)*
2. Appuyez sur le bouton **Partager** (carré avec flèche ↑)
3. Sélectionnez **"Sur l'écran d'accueil"**
4. Appuyez sur **"Ajouter"**

> L'app s'ouvre en plein écran, avec son icône sur l'écran d'accueil, comme une application native. Elle fonctionne également **hors connexion**.

---

## 🛠️ Stack technique

| Technologie | Rôle |
|---|---|
| **React 18 + Vite** | Framework UI & bundler |
| **Supabase** | Base de données & authentification temps réel |
| **Framer Motion** | Animations |
| **Service Worker (PWA)** | Cache & fonctionnement hors ligne |
| **GitHub Pages** | Hébergement |
| **GitHub Actions** | Déploiement automatique |

---

## 🚀 Développement local

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
# → Accessible sur http://localhost:5173
# → Accessible depuis le réseau local (mobile) via votre adresse IP

# Build de production
npm run build
```

Ou utilisez le script Windows :
```
start_app.bat
```

---

## 🔄 Déploiement

Le déploiement est **automatique** : chaque `git push` sur la branche `main` déclenche le workflow GitHub Actions qui build et déploie l'application sur GitHub Pages.

```bash
git add .
git commit -m "feat: description de la modification"
git push
# → L'app est mise à jour en ligne en ~2 minutes
```

---

## 🔐 Variables d'environnement

Les clés Supabase sont configurées dans `index.html` (variables directement dans le code pour une app statique sans serveur backend). Pour un usage en production multi-utilisateur, il est recommandé de passer par des variables d'environnement Vite.

---

*Pensé pour être efficace, conçu pour être plaisant.*
