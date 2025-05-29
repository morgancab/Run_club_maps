# Guide SEO - Sport Club Explorer Maps

## 🎯 Objectifs SEO

Ce guide détaille toutes les optimisations SEO mises en place pour **Sport Club Explorer Maps**, la carte interactive des clubs de course à pied en France.

### 📊 Score Lighthouse Attendu
- **Performance** : 95-100
- **Accessibilité** : 95-100
- **Bonnes Pratiques** : 95-100
- **SEO** : 100

## 🔍 Optimisations Implémentées

### 1. **Métadonnées HTML** (`index.html`)

#### Balises Meta Essentielles
```html
<!-- Titre optimisé SEO -->
<title>Carte Interactive des Clubs de Course à Pied | Sport Club Explorer Maps</title>

<!-- Description meta -->
<meta name="description" content="Découvrez et rejoignez les meilleurs clubs de course à pied près de chez vous. Carte interactive avec plus de 100 clubs en France." />

<!-- Mots-clés -->
<meta name="keywords" content="clubs course à pied, running clubs France, communauté running, carte clubs running" />

<!-- Auteur -->
<meta name="author" content="Sport Club Explorer Maps" />

<!-- Instructions robots -->
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

<!-- URL canonique -->
<link rel="canonical" href="https://run-club-maps.vercel.app/" />
```

#### Open Graph (Facebook, LinkedIn)
```html
<meta property="og:title" content="Carte Interactive des Clubs de Course à Pied | Sport Club Explorer Maps" />
<meta property="og:description" content="Découvrez et rejoignez les meilleurs clubs de course à pied près de chez vous." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://run-club-maps.vercel.app/" />
<meta property="og:image" content="https://run-club-maps.vercel.app/header-background.jpg" />
<meta property="og:site_name" content="Sport Club Explorer Maps" />
<meta property="og:locale" content="fr_FR" />
```

#### Twitter Cards
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Carte Interactive des Clubs de Course à Pied" />
<meta name="twitter:description" content="Découvrez les clubs de course à pied près de chez vous." />
<meta name="twitter:image" content="https://run-club-maps.vercel.app/header-background.jpg" />
```

### 2. **Données Structurées JSON-LD**

#### Application Web
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Sport Club Explorer Maps",
  "description": "Carte interactive pour découvrir et rejoindre les clubs de course à pied en France",
  "url": "https://run-club-maps.vercel.app/",
  "applicationCategory": "SportsApplication",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "150"
  }
}
```

#### Organisation
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Sport Club Explorer Maps",
  "url": "https://run-club-maps.vercel.app/",
  "description": "Plateforme de découverte des clubs de course à pied en France"
}
```

### 3. **Fichiers SEO** (`public/seo/`)

#### `robots.txt`
```
User-agent: *
Allow: /

# Sitemaps
Sitemap: https://run-club-maps.vercel.app/sitemap.xml

# Optimisations crawl
Crawl-delay: 1

# Pages importantes
Allow: /clubs/
Allow: /search/
```

#### `sitemap.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://run-club-maps.vercel.app/</loc>
    <lastmod>2024-12-19</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### 4. **PWA Manifest** (`public/manifest.json`)
```json
{
  "name": "Sport Club Explorer Maps - Carte Interactive des Clubs de Course",
  "short_name": "SCE Maps",
  "description": "Découvrez et rejoignez les clubs de course à pied près de chez vous",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#ff6b35",
  "background_color": "#ffffff"
}
```

### 5. **Optimisations Performance**

#### Headers de Cache (`.htaccess`)
```apache
# Cache des ressources statiques
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

#### Compression GZIP
```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/javascript
</IfModule>
```

### 6. **Accessibilité SEO**

#### HTML Sémantique
- Utilisation de `<main>`, `<header>`, `<nav>`, `<aside>`
- Balises `<h1>`, `<h2>`, `<h3>` structurées
- Attributs `alt` sur toutes les images
- Attributs ARIA pour l'accessibilité

#### Configuration Vite (`vite.config.ts`)
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          leaflet: ['leaflet', 'react-leaflet']
        }
      }
    }
  }
})
```

## 📈 Suivi et Mesures

### Outils de Validation
1. **Google Search Console** : Soumission sitemap
2. **Lighthouse** : Audit performance/SEO
3. **PageSpeed Insights** : Vitesse de chargement
4. **Rich Results Test** : Validation données structurées

### KPIs à Surveiller
- Position dans les SERPs pour "clubs course à pied France"
- Taux de clic organique
- Temps de session
- Core Web Vitals (LCP, FID, CLS)

### Améliorations Futures
1. **Contenu** : Blog sur la course à pied
2. **Local SEO** : Pages dédiées par ville
3. **Backlinks** : Partenariats avec clubs
4. **Schema.org** : Données structurées pour les clubs individuels

## 🎯 Mots-Clés Ciblés

### Principaux
- "clubs course à pied France"
- "running clubs près de moi"
- "communauté running"
- "carte clubs running"

### Longue traîne
- "rejoindre club course à pied Paris"
- "horaires clubs running Lyon"
- "communauté running débutants"
- "trouver partenaire course à pied"

---

*Guide SEO - Sport Club Explorer Maps | Mis à jour : Décembre 2024* 