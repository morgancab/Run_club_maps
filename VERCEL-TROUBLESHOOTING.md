# 🚨 Clubs invisibles sur Vercel - Guide de résolution rapide

## ❌ Problème
Après déploiement sur Vercel, les clubs n'apparaissent pas sur la carte alors qu'ils fonctionnent en local.

## ✅ Solution en 5 étapes

### 1. **Vérifier la variable d'environnement**
```bash
# Tester localement
npm run test:vercel
```

**Si "GOOGLE_SERVICE_ACCOUNT_KEY: ❌ Manquante"** :
1. Aller sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionner votre projet
3. **Settings** > **Environment Variables**
4. Cliquer **Add New**

### 2. **Configurer la variable correctement**
- **Name** : `GOOGLE_SERVICE_ACCOUNT_KEY`
- **Value** : Copier TOUT le contenu de `keys/google-service-account.json`
- **Environments** : ✅ Production ✅ Preview ✅ Development

**⚠️ Format attendu** :
```json
{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}
```

### 3. **Vérifier les permissions Google Sheet**
1. Ouvrir votre Google Sheet
2. Cliquer **Partager**
3. Ajouter l'email du compte de service (trouvé dans `client_email` du JSON)
4. Permissions : **Lecteur**
5. **Envoyer**

### 4. **Redéployer**
```bash
# Via Git
git add .
git commit -m "fix: update environment variables"
git push origin main

# Ou via CLI Vercel
vercel --prod
```

### 5. **Tester le déploiement**
```bash
# Tester l'API directement
curl https://votre-projet.vercel.app/api/runclubs

# Devrait retourner:
# {"type":"FeatureCollection","features":[...]}
```

## 🔍 Diagnostic avancé

### Vérifier les logs Vercel
1. Vercel Dashboard > **Functions**
2. Cliquer sur `/api/runclubs`
3. Vérifier les logs pour :
   - ✅ `Credentials Google chargées depuis les variables d'environnement`
   - ❌ Erreurs d'authentification

### Erreurs courantes

#### "Unable to parse range: Feuille1!A2:M"
**Cause** : Google Sheet non partagée ou nom de feuille incorrect
**Solution** : Partager la sheet avec le compte de service

#### "Authentication failed" / "invalid_grant"
**Cause** : Variable d'environnement mal configurée
**Solutions** :
1. Vérifier le format JSON complet
2. Régénérer la clé de service
3. Redéployer

#### "PEM routines:get_name:no start line"
**Cause** : Caractères `\n` mal interprétés (déjà corrigé dans le code)
**Solution** : Utiliser la version corrigée de `lib/fetchSheet.ts`

## 📋 Checklist finale

- [ ] Variable `GOOGLE_SERVICE_ACCOUNT_KEY` configurée dans Vercel
- [ ] Format JSON complet avec accolades `{}`
- [ ] Environnements Production, Preview, Development sélectionnés
- [ ] Google Sheet partagée avec le compte de service
- [ ] Permissions "Lecteur" accordées
- [ ] Redéploiement effectué
- [ ] API `/api/runclubs` retourne des données
- [ ] Clubs visibles sur la carte

## 🆘 Si ça ne marche toujours pas

1. **Régénérer la clé de service** :
   - Google Cloud Console > IAM & Admin > Comptes de service
   - Créer une nouvelle clé JSON
   - Remplacer dans Vercel

2. **Vérifier l'API Google Sheets** :
   - Google Cloud Console > APIs & Services > Library
   - Rechercher "Google Sheets API"
   - S'assurer qu'elle est activée

3. **Tester en local** :
   ```bash
   npm run test:api
   ```
   Si ça marche en local mais pas en production, c'est un problème de configuration Vercel.

## 🔗 Liens utiles

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Documentation complète](./DEPLOYMENT.md)

---

*Guide de résolution rapide - Version 1.0* 