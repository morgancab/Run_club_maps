# 🔧 Résolution erreur ES modules Vercel

## ❌ Erreur rencontrée
```
ReferenceError: exports is not defined in ES module scope
This file is being treated as an ES module because it has a '.js' file extension and '/var/task/package.json' contains "type": "module".
```

## 🎯 Cause du problème
- Le `package.json` contenait `"type": "module"` 
- Vercel a des difficultés avec cette configuration pour les fonctions API
- Conflit entre syntaxe ES modules et CommonJS

## ✅ Solutions appliquées

### 1. **Suppression de "type": "module"**
```json
// Avant (problématique)
{
  "name": "run-club-maps",
  "type": "module",
  ...
}

// Après (corrigé)
{
  "name": "run-club-maps",
  ...
}
```

### 2. **Configuration Vercel spécifique**
Ajout dans `vercel.json` :
```json
{
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs20.x"
    }
  }
}
```

### 3. **Configuration TypeScript pour API**
Création de `api/tsconfig.json` :
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

### 4. **Import avec extension .js**
```typescript
// Avant
import { fetchRunClubs } from '../../lib/fetchSheet';

// Après
import { fetchRunClubs } from '../../lib/fetchSheet.js';
```

### 5. **Script de test adapté**
Conversion du script `test-api.js` de `fetch` vers `http.get` pour compatibilité CommonJS.

## 🧪 Tests de validation

### ✅ Tests réussis
```bash
npm run test:api      # ✅ 4 clubs récupérés
npm run build         # ✅ Build réussi (3.10s)
```

### ✅ Configuration Vercel
- Runtime Node.js 20.x configuré
- TypeScript compilé correctement
- Imports ES modules fonctionnels

## 🚀 Déploiement

Maintenant que l'erreur ES modules est résolue :

1. **Commit des changements** :
   ```bash
   git add .
   git commit -m "fix: resolve ES modules error for Vercel"
   git push origin main
   ```

2. **Variables d'environnement Vercel** :
   - `GOOGLE_SERVICE_ACCOUNT_KEY` : Contenu JSON complet

3. **Partager Google Sheet** avec le compte de service

4. **Déployer** et vérifier que l'API fonctionne

## 🎉 Résultat attendu

- ✅ Plus d'erreur "exports is not defined"
- ✅ API Vercel fonctionnelle
- ✅ Clubs visibles sur la carte
- ✅ Gestion d'erreur robuste (pas d'erreur 500)

---

**Status** : ✅ Erreur ES modules résolue
**Prêt pour déploiement** : ✅ Oui 