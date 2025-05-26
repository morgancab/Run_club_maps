# 🚀 Guide de déploiement Vercel

## Problème résolu : "Function Runtimes must have a valid version"

### ✅ Solution appliquée

1. **Configuration Vercel simplifiée** (`vercel.json`)
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "installCommand": "npm install",
     "devCommand": "npm run dev",
     "framework": "vite"
   }
   ```

2. **Support des variables d'environnement** (`lib/fetchSheet.ts`)
   - Utilise `GOOGLE_SERVICE_ACCOUNT_KEY` en production
   - Fallback vers le fichier local en développement

## 📋 Étapes de déploiement

### 1. Préparer la clé Google
```bash
# Copier le contenu de votre clé JSON
cat keys/google-service-account.json
```

### 2. Configurer Vercel
1. Aller sur [vercel.com](https://vercel.com)
2. Importer votre projet GitHub
3. Aller dans **Settings** > **Environment Variables**
4. Ajouter :
   - **Name** : `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Value** : Le contenu JSON complet (tout le fichier)

### 3. Déployer
```bash
vercel --prod
```

## 🔧 Configuration automatique

Vercel détecte automatiquement :
- ✅ Framework Vite
- ✅ API routes dans `/api`
- ✅ Build command `npm run build`
- ✅ Output directory `dist`

## 🌐 URLs de production

- **Site** : `https://votre-projet.vercel.app`
- **API** : `https://votre-projet.vercel.app/api/runclubs`

## ⚠️ Points d'attention

1. **Clé Google** : Doit être au format JSON complet, pas seulement l'ID
2. **Permissions** : La Google Sheet doit être partagée avec le compte de service
3. **CORS** : Déjà configuré dans l'API pour accepter toutes les origines

## 🧪 Test après déploiement

```bash
curl https://votre-projet.vercel.app/api/runclubs
```

Devrait retourner :
```json
{
  "type": "FeatureCollection",
  "features": [...]
}
``` 