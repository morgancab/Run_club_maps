# 🚀 Guide de déploiement Vercel - Résolution des problèmes Google Sheets

## ❌ Problème : Clubs invisibles après déploiement

### Symptômes
- L'application fonctionne en local
- Après déploiement sur Vercel, les clubs n'apparaissent pas sur la carte
- Erreurs d'authentification Google Sheets dans les logs Vercel

### ✅ Solutions appliquées

## 1. **Correction de la clé privée Google**

**Problème** : Les caractères `\n` dans la clé privée ne sont pas correctement interprétés par Vercel.

**Solution** : Ajout du traitement automatique dans `lib/fetchSheet.ts` :
```typescript
if (rawCredentials.private_key) {
  rawCredentials.private_key = rawCredentials.private_key.replace(/\\n/g, '\n');
}
```

## 2. **Configuration Vercel simplifiée** (`vercel.json`)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "framework": "vite"
}
```

## 3. **Support des variables d'environnement** (`lib/fetchSheet.ts`)
- Utilise `GOOGLE_SERVICE_ACCOUNT_KEY` en production
- Fallback vers le fichier local en développement
- Gestion d'erreur améliorée avec logs de debug

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
   - **Environments** : Production, Preview, Development

### 3. Points critiques pour la variable d'environnement

#### ✅ Format correct
```json
{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n....\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

#### ❌ Erreurs courantes
- **Guillemets manquants** : Copier TOUT le JSON, y compris les `{}`
- **Caractères d'échappement** : Ne pas modifier les `\n` dans la clé privée
- **Espaces supplémentaires** : Pas d'espaces avant/après la valeur
- **Environnements manqués** : Ajouter à Production ET Preview

### 4. Vérification des permissions Google Sheet
1. Aller dans Google Cloud Console
2. **APIs & Services** > **Credentials**
3. Cliquer sur votre compte de service
4. Copier l'email du compte de service
5. Dans votre Google Sheet : **Partager** > Ajouter l'email du compte de service avec accès **Lecteur**

### 5. Déployer
```bash
# Via CLI Vercel
vercel --prod

# Ou via Git
git push origin main
```

## 🧪 Test après déploiement

### 1. Test API direct
```bash
curl https://votre-projet.vercel.app/api/runclubs
```

### 2. Vérification des logs
1. Aller dans Vercel Dashboard
2. **Functions** > Cliquer sur `/api/runclubs`
3. Vérifier les logs pour :
   - ✅ `Credentials Google chargées depuis les variables d'environnement`
   - ✅ `X lignes trouvées dans la plage`
   - ❌ Erreurs d'authentification

### 3. Test de l'application
- Ouvrir `https://votre-projet.vercel.app`
- Vérifier que les clubs apparaissent sur la carte
- Tester les filtres et popups

## 🔧 Dépannage

### Erreur : "Unable to parse range"
**Cause** : Nom de feuille incorrect ou permissions insuffisantes
**Solution** : Vérifier le partage de la Google Sheet

### Erreur : "Authentication failed"
**Cause** : Variable d'environnement mal configurée
**Solution** : 
1. Vérifier le format JSON complet
2. Régénérer la clé de service si nécessaire
3. Redéployer après modification

### Erreur : "PEM routines:get_name:no start line"
**Cause** : Caractères `\n` mal interprétés
**Solution** : Déjà corrigé dans le code avec `.replace(/\\n/g, '\n')`

### Clubs toujours invisibles
**Vérifications** :
1. Variables d'environnement bien définies pour **Production**
2. Google Sheet partagée avec le compte de service
3. Logs Vercel sans erreur d'authentification
4. API retourne bien des données : `/api/runclubs`

## 🌐 URLs de production

- **Site** : `https://votre-projet.vercel.app`
- **API** : `https://votre-projet.vercel.app/api/runclubs`

## ⚠️ Points d'attention

1. **Clé Google** : Doit être au format JSON complet, pas seulement l'ID
2. **Permissions** : La Google Sheet doit être partagée avec le compte de service
3. **CORS** : Déjà configuré dans l'API pour accepter toutes les origines
4. **Cache** : Vercel peut mettre en cache les variables d'environnement, redéployer si nécessaire

---

*Guide mis à jour avec les corrections spécifiques aux problèmes de déploiement Google Sheets sur Vercel* 