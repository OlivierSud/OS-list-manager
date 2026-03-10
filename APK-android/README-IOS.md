# 🍎 iOS — OS List Manager

## La différence fondamentale avec Android

| | Android | iOS |
|---|---|---|
| Installer librement (sideload) | ✅ Oui | ❌ Non |
| Build sans compte développeur | ✅ Oui | ❌ Non |
| Compte développeur | Gratuit | **99$/an** |
| Build nécessite macOS | Non | **Oui (obligatoire)** |
| "Sources inconnues" | ✅ Oui | ❌ Non |

---

## ⭐ Option 1 — PWA via Safari (Gratuite, disponible MAINTENANT)

**C'est la meilleure option.** Votre app est déjà une PWA parfaitement configurée.

Sur l'iPhone du destinataire :
1. Ouvrir **Safari** (uniquement Safari, pas Chrome)
2. Aller sur `https://oliviersud.github.io/OS-list-manager`
3. Taper sur le bouton **Partager** (carré ↑ en bas de l'écran)
4. Choisir **"Sur l'écran d'accueil"**
5. Taper **"Ajouter"**

✅ L'app s'ouvre en **plein écran** (sans barre Safari)  
✅ **Icône** personnalisée sur l'écran d'accueil  
✅ **Fonctionne hors ligne** (Service Worker déjà en place)  
✅ **Coût : 0€**

---

## Option 2 — IPA via GitHub Actions (Compte Apple à 99$/an requis)

Le workflow `.github/workflows/build-ios.yml` est préconfiguré.

### Prérequis
- [ ] Compte [Apple Developer](https://developer.apple.com/programs/) ($99/an)
- [ ] Certificat de distribution `.p12`
- [ ] Profil de provisioning `.mobileprovision`

### Configuration des Secrets GitHub

Allez dans votre dépôt GitHub → **Settings → Secrets and variables → Actions** et ajoutez :

| Secret | Description |
|---|---|
| `APPLE_CERTIFICATE_BASE64` | Certificat `.p12` encodé en Base64 |
| `APPLE_CERTIFICATE_PASSWORD` | Mot de passe du certificat |
| `APPLE_PROVISIONING_PROFILE` | Profil `.mobileprovision` encodé en Base64 |
| `APPLE_TEAM_ID` | Votre Team ID (ex: `ABCD1234EF`) |
| `APPLE_BUNDLE_ID` | Bundle ID (ex: `com.oliviersud.oslistmanager`) |

Pour encoder un fichier en Base64 :
```bash
# Sur macOS/Linux
base64 -i MonCertificat.p12 | pbcopy

# Sur Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("MonCertificat.p12")) | Set-Clipboard
```

### Déclenchement du build
1. GitHub → onglet **Actions**
2. Cliquer sur **"🍎 Build IPA iOS"**
3. Cliquer **"Run workflow"**
4. Télécharger l'IPA dans **Artifacts**

### Distribution de l'IPA

| Méthode | Coût | Facilité | Limite |
|---|---|---|---|
| **TestFlight** | Inclus (compte Apple) | ⭐⭐⭐ | 100 testeurs |
| **App Store** | Inclus (compte Apple) | ⭐⭐ | Revue Apple requise |
| **AltStore** | Gratuit | ⭐ | 3 apps max par Apple ID |

---

## Option 3 — PWABuilder (Mac + Xcode requis)

[PWABuilder](https://pwabuilder.com) peut générer un projet Xcode depuis votre PWA, mais la compilation en IPA finale nécessite **obligatoirement un Mac avec Xcode**.

---

## Résumé

```
Vous voulez iOS ?
├── Gratuit → Safari + "Ajouter à l'écran d'accueil" ✅ (Option 1)
│              Fonctionne parfaitement, déjà configuré !
│
└── App native vraie → Compte Apple $99/an (Option 2)
                       + Configurer les secrets GitHub
                       + Lancer le workflow build-ios.yml
```
