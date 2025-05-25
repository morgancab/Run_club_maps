# Social Run Club Maps 🏃‍♂️

Une application web interactive pour découvrir et explorer les clubs de running à travers une carte moderne et intuitive.

## 🎯 Fonctionnalités

- **🗺️ Carte interactive** : Visualisation des clubs de running avec React-Leaflet
- **📍 Marqueurs personnalisés** : Chaque club affiché avec son logo/image
- **💬 Popups détaillées** : Informations complètes (ville, fréquence, description, réseaux sociaux)
- **🔍 Filtres avancés** : Recherche par ville et jour de la semaine
- **📱 Design responsive** : Interface moderne et adaptative
- **🌐 Réseaux sociaux** : Liens directs vers Instagram, Facebook, TikTok, LinkedIn

## 🛠️ Technologies utilisées

- **React 18** avec TypeScript
- **Vite** pour le build et le développement
- **React-Leaflet** pour la cartographie interactive
- **Leaflet** pour les fonctionnalités de carte
- **CartoDB Positron** pour les tuiles de fond claires
- **CSS-in-JS** pour le styling

## 🚀 Installation et lancement

1. **Cloner le projet**
   ```bash
   git clone <url-du-repo>
   cd Run_club_maps
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Lancer en mode développement**
   ```bash
   npm run dev
   ```

4. **Ouvrir dans le navigateur**
   ```
   http://localhost:5173
   ```

## 📁 Structure du projet

```
src/
├── RunClubMap.tsx          # Composant principal de la carte
├── App.tsx                 # Point d'entrée de l'application
└── main.tsx               # Bootstrap React

public/
└── data/
    └── runclubs.geojson   # Données des clubs au format GeoJSON
```

## 📊 Format des données

Les clubs sont stockés dans `public/data/runclubs.geojson` au format GeoJSON :

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [longitude, latitude]
      },
      "properties": {
        "name": "Nom du club",
        "city": "Ville",
        "frequency": "Fréquence des sorties",
        "description": "Description du club",
        "image": "URL de l'image/logo",
        "social": {
          "website": "https://...",
          "instagram": "https://...",
          "facebook": "https://...",
          "tiktok": "https://...",
          "linkedin": "https://..."
        }
      }
    }
  ]
}
```

## ✨ Fonctionnalités détaillées

### Carte interactive
- Centrage automatique sur les clubs existants
- Zoom adaptatif selon la répartition géographique
- Contrôles de zoom repositionnés en bas à gauche

### Système de filtres
- **Filtre par ville** : Dropdown avec toutes les villes disponibles
- **Filtre par jour** : Sélection par jour de la semaine (Lundi, Mardi, etc.)
- **Compteur dynamique** : Affichage du nombre de clubs filtrés
- **Reset facile** : Bouton "Effacer" pour supprimer tous les filtres

### Interface utilisateur
- **Overlay moderne** : Design avec glassmorphism et dégradés
- **Logos des réseaux sociaux** : Icônes SVG officielles
- **Animations subtiles** : Hover effects et transitions fluides
- **État vide** : Message élégant quand aucun club ne correspond aux filtres

## 🎨 Personnalisation

### Ajouter un nouveau club
1. Modifier le fichier `public/data/runclubs.geojson`
2. Ajouter les coordonnées GPS du club
3. Remplir toutes les propriétés (nom, ville, fréquence, etc.)
4. La carte se mettra à jour automatiquement

### Modifier le style
- Les couleurs principales sont définies avec la variable `#ff6b35` (orange)
- Le design utilise des dégradés et des effets de transparence
- Police principale : Inter, system-ui, -apple-system

## 📱 Responsive Design

L'application s'adapte automatiquement à tous les écrans :
- **Desktop** : Interface complète avec overlay latéral
- **Mobile** : Optimisé pour les interactions tactiles
- **Tablet** : Layout adaptatif selon l'orientation

## 🔧 Scripts disponibles

- `npm run dev` : Lancement en mode développement
- `npm run build` : Build de production
- `npm run preview` : Aperçu du build de production
- `npm run lint` : Vérification du code avec ESLint

## 📄 Licence

Ce projet est sous licence MIT.

---

**Développé avec ❤️ pour la communauté running française** 🇫🇷
