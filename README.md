# 🏃‍♂️ Run Club Maps

Une carte interactive des clubs de running récupérés depuis Google Sheets avec React, TypeScript et Leaflet.

## 🚀 Démarrage rapide

### 1. Installation
```bash
npm install
```

### 2. Configuration Google Sheets
- Placez votre clé de service Google dans `keys/google-service-account.json`
- Assurez-vous que votre Google Sheet est partagée avec le compte de service
- **Google Sheet** : [Accéder à la feuille](https://docs.google.com/spreadsheets/d/1hsOICQY2d527Dah8-rLBlUApPmHgETKPfJxrhKazBhA/edit?gid=0#gid=0)
- ID de la feuille : `1hsOICQY2d527Dah8-rLBlUApPmHgETKPfJxrhKazBhA`

### 3. Développement local
```bash
# Lancer l'application complète (API + Frontend)
npm run dev

# Ou séparément :
npm run dev:api      # API seule (port 3001)
npm run dev:frontend # Frontend seul (port 5173)
```

### 4. Test de l'API
```bash
npm run test:api
```

### 5. Build de production
```bash
npm run build
```

## 📊 Structure Google Sheet

**🔗 Lien vers la Google Sheet** : [https://docs.google.com/spreadsheets/d/1hsOICQY2d527Dah8-rLBlUApPmHgETKPfJxrhKazBhA/edit?gid=0#gid=0](https://docs.google.com/spreadsheets/d/1hsOICQY2d527Dah8-rLBlUApPmHgETKPfJxrhKazBhA/edit?gid=0#gid=0)

La Google Sheet doit avoir cette structure (colonnes A-O) :

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| name | city | frequency | frequency_en | description | description_en | image | **latitude** | **longitude** | instagram | facebook | website | tiktok | linkedin | - |

**Important :** Les coordonnées sont en colonnes H (latitude) et I (longitude).

## 🌐 URLs d'accès

- **Frontend** : http://localhost:5173
- **API** : http://localhost:3001/api/runclubs
- **API via proxy** : http://localhost:5173/api/runclubs

## ✨ Fonctionnalités

- 🗺️ Carte interactive avec clustering
- 🔍 Filtres par ville et jour
- 🌍 Support multilingue (FR/EN)
- 📱 Interface responsive
- 🎨 Animation de chargement
- 📡 Données en temps réel depuis Google Sheets

## 🛠️ Technologies

- **Frontend** : React 19, TypeScript, Vite
- **Carte** : Leaflet, React-Leaflet
- **API** : Google Sheets API, Vercel Functions
- **Styling** : CSS-in-JS
- **Déploiement** : Vercel

## 📁 Structure du projet

```
Run_club_maps/
├── api/                    # API Vercel (Google Sheets)
├── src/                    # Code source React
├── lib/                    # Utilitaires (fetchSheet.ts)
├── keys/                   # Clés Google (gitignore)
├── scripts/                # Scripts de développement
├── public/                 # Assets statiques
└── dist/                   # Build de production
```

## 🔧 Scripts disponibles

- `npm run dev` - Développement complet (API + Frontend)
- `npm run dev:frontend` - Frontend seul
- `npm run dev:api` - API seule
- `npm run test:api` - Test de l'API Google Sheets
- `npm run test:vercel` - Test de configuration Vercel
- `npm run build` - Build de production
- `npm run preview` - Aperçu du build
- `npm run lint` - Vérification du code

## 🚀 Déploiement

### ⚠️ Problème courant : Clubs invisibles sur Vercel

Si après déploiement les clubs n'apparaissent pas, consultez le **[Guide de résolution rapide](./VERCEL-TROUBLESHOOTING.md)**.

### Configuration Vercel

1. **Test de configuration**
   ```bash
   npm run test:vercel
   ```

2. **Variables d'environnement**
   - Aller dans les paramètres de votre projet Vercel
   - Ajouter la variable : `GOOGLE_SERVICE_ACCOUNT_KEY`
   - Valeur : Le contenu JSON complet de votre clé de service Google
   - Environnements : Production, Preview, Development

3. **Déploiement**
   ```bash
   vercel --prod
   ```

### Variables d'environnement requises

- `GOOGLE_SERVICE_ACCOUNT_KEY` : Clé de service Google au format JSON
  
Voir `env.example` pour un exemple de configuration détaillé.

---

*Développé avec ❤️ pour la communauté running*
