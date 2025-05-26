# 🔧 Résolution erreur "does not provide an export named"

## ❌ Erreur rencontrée
```
SyntaxError: The requested module '../../lib/fetchSheet.js' does not provide an export named 'fetchRunClubs'
    at ModuleJob._instantiate (node:internal/modules/esm/module_job:123:21)
```

## 🎯 Cause du problème
- Le module `lib/fetchSheet.ts` utilise des imports ES modules
- Mais n'a pas de configuration `"type": "module"` dans son dossier
- L'import utilise l'extension `.js` mais le module n'est pas configuré correctement

## ✅ Solutions appliquées

### 1. **Configuration ES modules pour lib**
Création de `lib/package.json` :
```json
{
  "type": "module"
}
```

### 2. **Correction de l'import**
Dans `api/runclubs/index.ts` :
```typescript
// Avant (problématique)
import { fetchRunClubs } from '../../lib/fetchSheet.js';

// Après (corrigé)
import { fetchRunClubs } from '../../lib/fetchSheet';
```

### 3. **Structure finale des modules**
```
project/
├── package.json              # CommonJS
├── api/
│   ├── package.json          # ES modules
│   └── runclubs/
│       └── index.ts          # Import sans extension
├── lib/
│   ├── package.json          # ES modules (nouveau)
│   └── fetchSheet.ts         # Export ES modules
└── vercel.json               # Runtime @vercel/node@3.2.0
```

## 🔧 Explication technique

### Problème d'isolation des modules
- **Racine** : CommonJS pour compatibilité générale
- **API** : ES modules pour les fonctions Vercel
- **Lib** : ES modules pour les utilitaires partagés

### Résolution des imports
- TypeScript compile `.ts` → `.js`
- Vercel respecte la configuration `"type": "module"`
- L'import sans extension fonctionne avec la résolution de modules

## 🧪 Tests de validation

### ✅ Tests réussis
```bash
npm run build         # ✅ Build réussi (4.40s)
npm run test:vercel   # ✅ Configuration validée
```

### ✅ Vérification des exports
Le fichier `lib/fetchSheet.ts` exporte correctement :
```typescript
export async function fetchRunClubs(): Promise<RunClubFeature[]> {
  // ... implémentation
}
```

## 🚀 Déploiement

1. **Commit des changements** :
   ```bash
   git add lib/package.json api/runclubs/index.ts
   git commit -m "fix: resolve ES modules export error for lib functions"
   git push origin main
   ```

2. **Variables d'environnement** :
   - `GOOGLE_SERVICE_ACCOUNT_KEY` dans Vercel Dashboard

3. **Déployer** :
   - Le déploiement se relancera automatiquement

## 🎉 Résultat attendu
- ✅ Plus d'erreur "does not provide an export named"
- ✅ Import/export ES modules fonctionnel
- ✅ Fonctions API et lib compatibles
- ✅ Configuration modulaire isolée

---

**Status** : ✅ Erreur d'export ES modules résolue
**Prêt pour déploiement** : ✅ Oui 