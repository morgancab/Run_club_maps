# Organisation du Dossier Public

Ce dossier contient tous les fichiers statiques de l'application **Social Club Explorer Maps**.

## 📁 Structure des Dossiers

### 🖼️ `/images/`
Contient toutes les images des clubs de course :
- `runners_club_mont.png` - Logo Runners Club Mont
- `nice_running_club.png` - Logo Nice Running Club  
- `Lyon_city_goats.png` - Logo Lyon City Goats
- `K2_running_club.png` - Logo K2 Running Club

### 🎨 `/icons/`
Contient les icônes et favicons :
- `favicon.svg` - Favicon principal du site (thème piste d'athlétisme)
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
- [ ] Favicon visible dans les onglets du navigateur

## 📊 Optimisations

### Images
- **Compression** : Les images sont optimisées pour le web
- **Cache** : Headers de cache longue durée (1 an)
- **CDN** : Compatible avec les CDN

### SEO
- **Gzip** : Tous les fichiers texte sont compressés
- **Headers** : Optimisés pour le référencement
- **Structure** : Organisation claire pour les robots

---

*Dernière mise à jour : Décembre 2024* 