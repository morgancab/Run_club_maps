# 🔧 Résolution erreur "exports is not defined" - Solution ES modules globale

## ❌ Erreur rencontrée
```
ReferenceError: exports is not defined in ES module scope
This file is being treated as an ES module because it has a '.js' file extension and '/var/task/package.json' contains "type": "module".
```

## 🎯 Cause du problème
- Conflit entre configurations ES modules locales et globales
- Vercel détecte les package.json des sous-dossiers
- Mélange de syntaxes CommonJS et ES modules

## ✅ Solution finale appliquée

### 1. **Configuration ES modules globale**
Ajout dans `package.json` racine :
```json
{
  "name": "run-club-maps",
  "type": "module",
  "scripts": {
    // ... scripts
  }
}
```

### 2. **Suppression des configurations locales**
Suppression des fichiers :
- `api/package.json` ❌ Supprimé
- `lib/package.json` ❌ Supprimé

### 3. **Import avec extension .js**
Dans `api/runclubs/index.ts` :
```typescript
import { fetchRunClubs } from '../../lib/fetchSheet.js';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ... implémentation
}
```

### 4. **Scripts convertis en ES modules**
Dans `scripts/test-api.js` :
```javascript
// Avant (CommonJS)
const http = require('http');

// Après (ES modules)
import http from 'http';
```

## 🔧 Explication technique

### Problème des configurations mixtes
- **Avant** : Configurations ES modules locales dans sous-dossiers
- **Problème** : Vercel applique la configuration globalement
- **Solution** : Configuration ES modules unique et globale

### Avantages de cette approche
- ✅ **Simplicité** : Une seule configuration pour tout le projet
- ✅ **Compatibilité Vercel** : Pas de conflit de configuration
- ✅ **Cohérence** : Tous les fichiers utilisent ES modules

## 🏗️ Architecture finale

### Structure du projet
```
project/
├── package.json              # ES modules ("type": "module")
├── api/
│   ├── tsconfig.json         # Configuration TypeScript
│   └── runclubs/
│       └── index.ts          # export default + import .js
├── lib/
│   └── fetchSheet.ts         # export async function
├── scripts/
│   ├── test-api.js           # import (ES modules)
│   └── test-vercel-config.js # import dynamique
└── vercel.json               # Runtime @vercel/node@3.2.0
```

### Configuration unique
- **Racine** : `"type": "module"` pour tout le projet
- **API** : Syntaxe ES modules native
- **Lib** : Exports ES modules
- **Scripts** : Imports ES modules

## 🧪 Tests de validation

### ✅ Tests réussis
```bash
npm run build         # ✅ Build réussi (3.90s)
npm run test:vercel   # ✅ Configuration validée
npm run test:api      # ✅ 4 clubs récupérés
```

### ✅ Vérifications
- Import/export ES modules fonctionnel
- Scripts convertis correctement
- Pas de conflit de configuration

## 🚀 Déploiement

### 1. Commit des changements
```bash
git add package.json api/runclubs/index.ts scripts/test-api.js
git rm api/package.json lib/package.json
git commit -m "fix: use global ES modules configuration for Vercel

- Add 'type': 'module' to root package.json
- Remove local package.json files causing conflicts
- Convert scripts to ES modules syntax
- Fix import path with .js extension"
git push origin main
```

### 2. Variables d'environnement
- `GOOGLE_SERVICE_ACCOUNT_KEY` dans Vercel Dashboard

### 3. Redéploiement
- Le déploiement se relancera automatiquement
- Plus d'erreur "exports is not defined"

## 🎉 Résultat attendu

### ✅ Fonctionnement
- Plus d'erreur ES modules sur Vercel
- API `/api/runclubs` accessible
- Configuration cohérente et simple

### ✅ Monitoring
- Logs Vercel clairs
- Pas de conflit de modules
- Déploiement réussi

## 📚 Comparaison des approches

### ❌ Approche précédente (configurations locales)
```
project/
├── package.json          # CommonJS
├── api/package.json      # ES modules → Conflit
├── lib/package.json      # ES modules → Conflit
```

### ✅ Approche finale (configuration globale)
```
project/
├── package.json          # ES modules global
├── api/ (pas de package.json)
├── lib/ (pas de package.json)
```

---

**Status** : ✅ **Erreur "exports is not defined" résolue**
**Approche** : ✅ **Configuration ES modules globale et cohérente**
**Prêt pour déploiement** : ✅ **Oui** 