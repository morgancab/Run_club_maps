# Organisation du Dossier Public

Ce dossier contient tous les fichiers statiques de l'application **Sport Club Explorer Maps**.

## 📁 Structure des Dossiers

### 🖼️ `/images/`
Contient toutes les images des clubs de course :
- `runners_club_mont.png` - Logo Runners Club Mont
- `nice_running_club.png` - Logo Nice Running Club  
- `Lyon_city_goats.png` - Logo Lyon City Goats
- `K2_running_club.png` - Logo K2 Running Club

### 🎨 `/icons/`
Contient les icônes et favicons :
- `SCE-logo.png` - **Logo principal Sport Club Explorer** (favicon, PWA, réseaux sociaux)
- `favicon.svg` - Favicon SVG de fallback (thème piste d'athlétisme)
- `vite.svg` - Logo Vite (outil de build)

### 🔍 `/seo/`
Contient les fichiers SEO organisés :
- `robots.txt` - Instructions pour les robots des moteurs de recherche
- `sitemap.xml` - Plan du site pour l'indexation

## 📄 Fichiers à la Racine

### Fichiers de Configuration
- `manifest.json` - Configuration PWA (Progressive Web App)
- `.htaccess` - Configuration serveur Apache avec redirections SEO

### Fichiers SEO (Copies)
- `robots.txt` - **Copie** depuis `/seo/` pour accessibilité directe
- `sitemap.xml` - **Copie** depuis `/seo/` pour accessibilité directe

### Images Principales
- `header-background.jpg` - Image de fond pour l'en-tête

## 🔄 Redirections et Accessibilité

Les fichiers SEO sont organisés dans `/seo/` mais restent accessibles à la racine grâce aux :

1. **Redirections .htaccess** (pour Apache)
2. **Copies physiques** (pour Vercel et autres hébergeurs)

## 📝 Conventions de Nommage

### Logo Principal
- `SCE-logo.png` - Logo officiel Sport Club Explorer
  - Utilisé pour : favicon, PWA, réseaux sociaux, partages
  - Tailles multiples supportées : 16x16, 32x32, 180x180, 192x192, 512x512
  - Format PNG avec transparence recommandé

### Images des Clubs
- Format : `nom_club.png`
- Taille recommandée : 60x60px minimum
- Format : PNG avec transparence

### Icônes
- Format SVG préféré pour la scalabilité
- Fallback PNG pour compatibilité

### SEO
- `robots.txt` - Standard web
- `sitemap.xml` - Standard XML sitemap

## 🚀 Déploiement

Lors du build (`npm run build`), tous ces fichiers sont copiés dans `/dist/` avec la même structure.

### Vérifications Post-Déploiement
- [ ] `https://votre-site.com/robots.txt` accessible
- [ ] `https://votre-site.com/sitemap.xml` accessible  
- [ ] `https://votre-site.com/manifest.json` accessible
- [ ] **Logo SCE visible** dans les onglets du navigateur
- [ ] **Logo SCE affiché** lors des partages sur réseaux sociaux
- [ ] **PWA installable** avec le logo SCE

## 📊 Optimisations

### Images
- **Compression** : Les images sont optimisées pour le web
- **Cache** : Headers de cache longue durée (1 an)
- **CDN** : Compatible avec les CDN
- **Logo SCE** : Préchargé pour une affichage rapide

### SEO
- **Gzip** : Tous les fichiers texte sont compressés
- **Headers** : Optimisés pour le référencement
- **Structure** : Organisation claire pour les robots
- **Métadonnées** : Logo SCE intégré dans les données structurées

## 🎨 Branding

Le site utilise maintenant le **logo SCE** (Sport Club Explorer) comme identité visuelle principale :
- **Favicon** : Icône dans les onglets du navigateur
- **PWA** : Icône de l'application installée
- **Réseaux sociaux** : Image lors des partages
- **Apple Touch Icon** : Icône sur iOS/Safari

---

*Dernière mise à jour : Décembre 2024* 