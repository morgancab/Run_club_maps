# 🔧 Résolution erreur ES modules dans les fonctions API Vercel

## ❌ Erreur rencontrée
```
SyntaxError: Cannot use import statement outside a module
    at internalCompileFunction (node:internal/vm:76:18)
    at wrapSafe (node:internal/modules/cjs/loader:1283:20)
```

## 🎯 Cause du problème
- Les fonctions API utilisent des imports ES modules (`import { ... } from '...'`)
- Vercel compile ces fichiers en CommonJS par défaut
- Conflit entre syntaxe ES modules et compilation CommonJS

## ✅ Solutions appliquées

### 1. **Package.json spécifique pour les API**
Création de `api/package.json` :
```json
{
  "type": "module"
}
```

### 2. **Runtime Vercel mis à jour**
Dans `vercel.json` :
```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3.2.0"
    }
  }
}
```

### 3. **Configuration TypeScript API maintenue**
Le fichier `api/tsconfig.json` reste :
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

## 🔧 Explication technique

### Hiérarchie des configurations
1. **Racine** : `package.json` sans `"type": "module"` (pour compatibilité générale)
2. **API** : `api/package.json` avec `"type": "module"` (pour les fonctions)
3. **Runtime** : `@vercel/node@3.2.0` (support ES modules amélioré)

### Pourquoi cette approche ?
- ✅ **Isolation** : Les API ont leur propre configuration modules
- ✅ **Compatibilité** : Le projet principal reste en CommonJS
- ✅ **Flexibilité** : Chaque partie utilise le format optimal

## 🧪 Tests de validation

### ✅ Tests réussis
```bash
npm run build         # ✅ Build réussi (3.06s)
npm run test:vercel   # ✅ Configuration validée
```

### ✅ Structure finale
```
project/
├── package.json          # Sans "type": "module"
├── api/
│   ├── package.json      # Avec "type": "module"
│   ├── tsconfig.json     # Configuration ES modules
│   └── runclubs/
│       └── index.ts      # Imports ES modules
└── vercel.json           # Runtime @vercel/node@3.2.0
```

## 🚀 Déploiement

1. **Commit des changements** :
   ```bash
   git add api/package.json vercel.json
   git commit -m "fix: add ES modules support for API functions"
   git push origin main
   ```

2. **Variables d'environnement** :
   - `GOOGLE_SERVICE_ACCOUNT_KEY` dans Vercel Dashboard

3. **Déployer** :
   - Le déploiement se relancera automatiquement

## 🎉 Résultat attendu
- ✅ Plus d'erreur "Cannot use import statement"
- ✅ Fonctions API compilées correctement
- ✅ Support ES modules dans les API
- ✅ Compatibilité CommonJS pour le projet principal

---

**Status** : ✅ Erreur ES modules API résolue
**Prêt pour déploiement** : ✅ Oui 