import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { useSEO, useClubStructuredData } from './hooks/useSEO';

interface RunClubFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    name: string;
    city?: string;
    frequency?: string;
    description?: string;
    image?: string;
    social?: {
      website?: string;
      instagram?: string;
      facebook?: string;
      tiktok?: string;
      whatsapp?: string;
      strava?: string;
    };
    // Traductions optionnelles
    name_en?: string;
    frequency_en?: string;
    description_en?: string;
  };
}

// Fonction pour créer une icône personnalisée avec l'image du club
const createCustomIcon = (imageUrl: string, clubName: string) => {
  // Corriger le chemin de l'image si nécessaire
  let correctedImageUrl = imageUrl;
  
  if (imageUrl) {
    // Si c'est une URL du site qui pointe vers un fichier PNG/JPG à la racine
    if (imageUrl.includes('run-club-maps.vercel.app/') && 
        (imageUrl.includes('.png') || imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) &&
        !imageUrl.includes('/images/')) {
      // Extraire le nom de fichier et le corriger
      const fileName = imageUrl.split('/').pop();
      correctedImageUrl = `/images/${fileName}`;
      console.log(`🔧 Correction URL Vercel pour ${clubName}:`, imageUrl, '→', correctedImageUrl);
    }
    // Si c'est juste un nom de fichier local
    else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/images/')) {
      correctedImageUrl = `/images/${imageUrl}`;
      console.log(`🔧 Correction chemin local pour ${clubName}:`, imageUrl, '→', correctedImageUrl);
    } else {
      console.log(`✅ Chemin image OK pour ${clubName}:`, imageUrl);
    }
  }

  return L.divIcon({
    html: `
      <div style="
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 3px solid #ff6b35;
        overflow: hidden;
        background: white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <img 
          src="${correctedImageUrl}" 
          alt="${clubName}"
          style="
            width: 44px;
            height: 44px;
            border-radius: 50%;
            object-fit: cover;
          "
          onerror="console.log('❌ Erreur chargement image:', '${correctedImageUrl}'); this.style.display='none'; this.parentElement.innerHTML='🏃‍♂️';"
        />
      </div>
    `,
    className: 'custom-club-icon',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
  });
};

// Composant pour ajouter les contrôles de zoom en bas à gauche
function ZoomControlBottomLeft() {
  const map = useMap();
  
  useEffect(() => {
    const zoomControl = L.control.zoom({
      position: 'bottomleft'
    });
    
    map.addControl(zoomControl);
    
    return () => {
      map.removeControl(zoomControl);
    };
  }, [map]);
  
  return null;
}

// Composant pour gérer les clics sur la carte (fermeture overlay mobile)
function MapClickHandler({ isMobile, showOverlay, setShowOverlay }: { 
  isMobile: boolean; 
  showOverlay: boolean; 
  setShowOverlay: (show: boolean) => void; 
}) {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = () => {
      if (isMobile && showOverlay) {
        setShowOverlay(false);
      }
    };
    
    map.on('click', handleClick);
    
    return () => {
      map.off('click', handleClick);
    };
  }, [map, isMobile, showOverlay, setShowOverlay]);
  
  return null;
}

// Composant pour gérer le clustering des marqueurs
function ClusteredMarkers({ clubs, getClubText, t, selectedClubId }: { 
  clubs: RunClubFeature[]; 
  getClubText: (club: RunClubFeature, field: 'name' | 'frequency' | 'description') => string;
  t: any;
  selectedClubId: string | undefined;
}) {
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  
  useEffect(() => {
    // Créer le groupe de clusters avec configuration anti-flash
    const markerClusterGroup = (L as any).markerClusterGroup({
      iconCreateFunction: function(cluster: any) {
        const count = cluster.getChildCount();
        const size = count < 10 ? 50 : count < 100 ? 60 : 70;
        
        return L.divIcon({
          html: `
            <div style="
              width: ${size}px;
              height: ${size}px;
              border-radius: 50%;
              background: linear-gradient(135deg, rgba(255, 107, 53, 0.95) 0%, rgba(247, 147, 30, 0.95) 50%, rgba(255, 140, 66, 0.95) 100%);
              border: 2px solid rgba(255, 255, 255, 0.8);
              box-shadow: 
                0 8px 32px rgba(255, 107, 53, 0.4),
                0 4px 16px rgba(0, 0, 0, 0.1),
                inset 0 2px 4px rgba(255, 255, 255, 0.3),
                inset 0 -2px 4px rgba(0, 0, 0, 0.1);
              backdrop-filter: blur(10px);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 800;
              font-size: ${count > 99 ? Math.max(12, 16 - Math.floor(count/100)) : count > 9 ? '14px' : '16px'};
              font-family: 'Arial', sans-serif;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
              position: relative;
              transform: scale(1);
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            ">
              <div style="
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                border-radius: 50%;
                background: linear-gradient(45deg, rgba(255, 255, 255, 0.3), transparent 50%, rgba(255, 255, 255, 0.1));
                pointer-events: none;
              "></div>
              <span style="
                position: relative;
                z-index: 2;
                display: flex;
                align-items: center;
                gap: 2px;
              ">
                <span style="font-variant-numeric: tabular-nums;">${count}</span>
              </span>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                width: ${size + 20}px;
                height: ${size + 20}px;
                border-radius: 50%;
                border: 1px solid rgba(255, 107, 53, 0.2);
                transform: translate(-50%, -50%) scale(0);
                animation: pulse-ring 2s infinite ease-out;
                pointer-events: none;
              "></div>
            </div>
          `,
          className: 'custom-cluster-icon-modern',
          iconSize: [size, size],
          iconAnchor: [size/2, size/2]
        });
      },
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      // Configuration anti-flash optimisée
      animate: false,                    // Désactiver l'animation générale
      animateAddingMarkers: false,       // Pas d'animation à l'ajout
      disableClusteringAtZoom: 16,       // Désactiver clustering plus tôt
      spiderfyDistanceMultiplier: 1.5,
      chunkedLoading: false,             // Chargement direct
      // Options supplémentaires pour éviter le flash
      removeOutsideVisibleBounds: false, // Garder les marqueurs en mémoire
      spiderfyShapePositions: function(count: number, centerPt: any) {
        // Position personnalisée pour éviter le flash
        const positions = [];
        const legLength = 30;
        const angleStep = (2 * Math.PI) / count;
        
        for (let i = 0; i < count; i++) {
          const angle = i * angleStep;
          positions.push([
            centerPt.x + legLength * Math.cos(angle),
            centerPt.y + legLength * Math.sin(angle)
          ]);
        }
        return positions;
      }
    });

    // Ajouter les marqueurs au groupe de clusters
    clubs.forEach((club) => {
      // Créer un ID unique basé sur les propriétés du club plutôt que sur l'index
      const clubId = `${club.properties.name}-${club.geometry.coordinates[0]}-${club.geometry.coordinates[1]}`;
      const lat = club.geometry.coordinates[1];
      const lng = club.geometry.coordinates[0];
      
      // Vérifier que les coordonnées sont valides
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
        console.warn(`Coordonnées invalides pour ${club.properties.name}:`, { lat, lng });
        return;
      }
      
      // Créer le marqueur avec des options anti-flash
      const marker = L.marker([lat, lng], {
        icon: createCustomIcon(
          club.properties.image || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=60&h=60&fit=crop&crop=center',
          club.properties.name
        ),
        riseOnHover: true,
        riseOffset: 250,
        // Options pour éviter le flash
        opacity: 1,
        // Forcer la position immédiatement
        bubblingMouseEvents: false
      });

      // Forcer la position du marqueur pour éviter le flash en (0,0)
      marker.setLatLng([lat, lng]);
      
      // Stocker la référence du marqueur
      markersRef.current.set(clubId, marker);

      // Fonction pour corriger le chemin d'une image
      const getCorrectImagePath = (imageUrl: string) => {
        if (!imageUrl) return '';
        
        // Si c'est une URL du site qui pointe vers un fichier PNG/JPG à la racine
        if (imageUrl.includes('run-club-maps.vercel.app/') && 
            (imageUrl.includes('.png') || imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) &&
            !imageUrl.includes('/images/')) {
          const fileName = imageUrl.split('/').pop();
          return `/images/${fileName}`;
        }
        // Si c'est juste un nom de fichier local
        else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/images/')) {
          return `/images/${imageUrl}`;
        }
        
        return imageUrl;
      };

      // Créer le contenu du popup
      const popupContent = `
        <div style="min-width: 280px; font-family: Arial, sans-serif; line-height: 1.4;">
          <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #ff6b35;">
            ${club.properties.image ? `<img src="${getCorrectImagePath(club.properties.image)}" alt="${club.properties.name}" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 12px; object-fit: cover; border: 3px solid #ff6b35;" />` : ''}
            <h3 style="margin: 0; color: #ff6b35; font-size: 18px; font-weight: bold;">${getClubText(club, 'name')}</h3>
          </div>
          ${club.properties.city ? `
            <div style="margin-bottom: 12px;">
              <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #333;">📍 ${t.city}</h4>
              <p style="margin: 0; font-size: 14px; color: #666;">${club.properties.city}</p>
            </div>
          ` : ''}
          ${(club.properties.frequency || club.properties.frequency_en) ? `
            <div style="margin-bottom: 12px;">
              <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #333;">⏰ ${t.frequency}</h4>
              <p style="margin: 0; font-size: 14px; color: #666;">${getClubText(club, 'frequency')}</p>
            </div>
          ` : ''}
          ${(club.properties.description || club.properties.description_en) ? `
            <div style="margin-bottom: 15px;">
              <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #333;">📝 ${t.description}</h4>
              <p style="margin: 0; font-size: 14px; color: #666; line-height: 1.5;">${getClubText(club, 'description')}</p>
            </div>
          ` : ''}
          ${club.properties.social && Object.keys(club.properties.social).length > 0 ? `
            <div>
              <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #333;">🌐 ${t.socialNetworks}</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${club.properties.social.website ? `<a href="${club.properties.social.website}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #ff6b35; text-decoration: none; font-size: 13px; font-weight: bold; padding: 6px 10px; background-color: #fff5f0; border-radius: 12px; border: 1px solid #ff6b35;">🔗 ${t.site}</a>` : ''}
                ${club.properties.social.instagram ? `<a href="${club.properties.social.instagram}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #E4405F; text-decoration: none; font-size: 13px; font-weight: bold; padding: 6px 10px; background-color: #fdf2f8; border-radius: 12px; border: 1px solid #E4405F;">📷 Instagram</a>` : ''}
                ${club.properties.social.facebook ? `<a href="${club.properties.social.facebook}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #1877F2; text-decoration: none; font-size: 13px; font-weight: bold; padding: 6px 10px; background-color: #eff6ff; border-radius: 12px; border: 1px solid #1877F2;">📘 Facebook</a>` : ''}
                ${club.properties.social.tiktok ? `<a href="${club.properties.social.tiktok}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #000000; text-decoration: none; font-size: 13px; font-weight: bold; padding: 6px 10px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #000000;">🎵 TikTok</a>` : ''}
                ${club.properties.social.whatsapp ? `<a href="${club.properties.social.whatsapp}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #25D366; text-decoration: none; font-size: 13px; font-weight: bold; padding: 6px 10px; background-color: #f0fdf4; border-radius: 12px; border: 1px solid #25D366;">💬 WhatsApp</a>` : ''}
                ${club.properties.social.strava ? `<a href="${club.properties.social.strava}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #FC4C02; text-decoration: none; font-size: 13px; font-weight: bold; padding: 6px 10px; background-color: #fff7ed; border-radius: 12px; border: 1px solid #FC4C02;">🏃 Strava</a>` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      
      // Ajouter le marqueur au cluster seulement si les coordonnées sont valides
      // Utiliser addLayers en batch pour éviter le flash
      markerClusterGroup.addLayer(marker);
    });

    // Ajouter le groupe de clusters à la carte directement
    // Les options anti-flash sont déjà configurées dans markerClusterGroup
    map.addLayer(markerClusterGroup);

    // Nettoyer lors du démontage
    return () => {
      map.removeLayer(markerClusterGroup);
      markersRef.current.clear();
    };
  }, [map, clubs, getClubText, t]);

  // Effet pour ouvrir la popup du club sélectionné
  useEffect(() => {
    if (selectedClubId && markersRef.current.has(selectedClubId)) {
      const marker = markersRef.current.get(selectedClubId);
      if (marker) {
        // Ouvrir la popup avec un petit délai pour s'assurer que la carte est centrée
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
    }
  }, [selectedClubId]);

  return null;
}

// Système de traduction
const translations = {
  fr: {
    title: 'Sport Club Explorer',
    subtitle: '🗺️ Carte Interactive',
    clubsList: 'Liste des clubs',
    loading: 'Chargement de la carte...',
    city: 'Ville',
    day: 'Jour',
    all: 'Tous',
    allCities: 'Toutes',
    clear: 'Effacer',
    search: 'Rechercher un club...',
    addClub: 'Suggérer un club',
    addClubTooltip: 'Vous connaissez un club qui devrait apparaître sur la carte ?',
    info: 'En savoir plus',
    aboutProject: 'À propos du projet',
    projectDescription: 'Sport Club Explorer est une carte interactive collaborative qui référence les clubs de running en France.',
    projectGoal: 'Notre objectif est de créer une communauté où chacun peut découvrir et partager des clubs de course près de chez soi.',
    howItWorks: 'Comment ça marche ?',
    step1: '🗺️ Explorez la carte pour découvrir les clubs',
    step2: '🔍 Utilisez les filtres pour affiner votre recherche',
    step3: '📍 Cliquez sur un marqueur pour voir les détails',
    step4: '➕ Suggérez de nouveaux clubs via notre formulaire',
    contribute: 'Contribuer au projet',
    contributeText: 'Vous connaissez un club qui n\'est pas encore référencé ? Aidez-nous à enrichir la carte !',
    suggestClub: 'Suggérer un club',
    close: 'Fermer',
    noClubsFound: 'Aucun club trouvé',
    tryModifyFilters: 'Essayez de modifier vos filtres ou votre recherche',
    clickToLocate: 'Cliquer pour localiser',
    site: 'Site',
    description: 'Description',
    frequency: 'Fréquence',
    socialNetworks: 'Réseaux sociaux',
    visitSite: 'Visiter le site',
    disclaimer: 'Avertissement Important',
    disclaimerText: 'Les données affichées sur cette carte sont fournies à titre indicatif et peuvent ne pas être à jour. Nous vous recommandons de vérifier directement auprès des clubs (horaires, lieux, contacts) avant de vous déplacer.',
    contactUs: 'Si vous constatez une erreur ou souhaitez proposer une correction, n\'hésitez pas à nous contacter et à contribuer à l\'amélioration du projet.',
    backToMap: 'Retour à la carte',
    clearFilters: 'Effacer les filtres',
    findYourClub: 'Trouve ton club',
    followUs: 'Suivez-nous',
    followUsText: 'Restez connecté avec la communauté Sport Club Explorer sur Instagram pour découvrir de nouveaux clubs et partager vos expériences de course !',
    visitInstagram: 'Visiter notre Instagram',
    days: {
      monday: 'Lundi',
      tuesday: 'Mardi', 
      wednesday: 'Mercredi',
      thursday: 'Jeudi',
      friday: 'Vendredi',
      saturday: 'Samedi',
      sunday: 'Dimanche'
    }
  },
  en: {
    title: 'Sport Club Explorer',
    subtitle: '🗺️ Interactive Maps',
    clubsList: 'Clubs list',
    loading: 'Loading map...',
    city: 'City',
    day: 'Day',
    all: 'All',
    allCities: 'All',
    clear: 'Clear',
    search: 'Search for a club...',
    addClub: 'Suggest a club',
    addClubTooltip: 'Know a club that should appear on the map?',
    info: 'Learn more',
    aboutProject: 'About the project',
    projectDescription: 'Sport Club Explorer is a collaborative interactive map that references running clubs in France.',
    projectGoal: 'Our goal is to create a community where everyone can discover and share running clubs near them.',
    howItWorks: 'How it works?',
    step1: '🗺️ Explore the map to discover clubs',
    step2: '🔍 Use filters to refine your search',
    step3: '📍 Click on a marker to see details',
    step4: '➕ Suggest new clubs via our form',
    contribute: 'Contribute to the project',
    contributeText: 'Know a club that isn\'t listed yet? Help us enrich the map!',
    suggestClub: 'Suggest a club',
    close: 'Close',
    noClubsFound: 'No clubs found',
    tryModifyFilters: 'Try modifying your filters or search',
    clickToLocate: 'Click to locate',
    site: 'Website',
    description: 'Description',
    frequency: 'Frequency',
    socialNetworks: 'Social Networks',
    visitSite: 'Visit Site',
    disclaimer: 'Important Disclaimer',
    disclaimerText: 'The data displayed on this map is provided for informational purposes only and may not be up to date. We recommend verifying directly with the clubs (schedules, locations, contacts) before visiting.',
    contactUs: 'If you notice an error or would like to suggest a correction, please do not hesitate to contact us and contribute to improving the project.',
    backToMap: 'Back to Map',
    clearFilters: 'Clear Filters',
    findYourClub: 'Find Your Club',
    followUs: 'Follow Us',
    followUsText: 'Stay connected with the Sport Club Explorer community on Instagram to discover new clubs and share your running experiences!',
    visitInstagram: 'Visit our Instagram',
    days: {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    }
  }
};

type Language = 'fr' | 'en';

export default function RunClubMap() {
  const [clubs, setClubs] = useState<RunClubFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([46.5, 2.5]);
  const [mapZoom, setMapZoom] = useState(6);
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterDay, setFilterDay] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [language, setLanguage] = useState<Language>('fr');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [selectedClubId, setSelectedClubId] = useState<string | undefined>(undefined);
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const mapRef = useRef<any>(null);

  // Fonction pour obtenir les traductions
  const t = translations[language];

  // Générer les données structurées pour les clubs
  const clubStructuredData = useClubStructuredData(clubs, language);

  // Hook SEO dynamique
  useSEO({
    title: language === 'fr' 
      ? clubs.length > 0 
        ? `Carte Interactive des Clubs de Course à Pied | ${clubs.length} Clubs en France`
        : 'Carte Interactive des Clubs de Course à Pied en France'
      : clubs.length > 0
        ? `Interactive Running Clubs Map | ${clubs.length} Clubs in France`
        : 'Interactive Running Clubs Map in France',
    description: language === 'fr'
      ? clubs.length > 0
        ? `Découvrez ${clubs.length} clubs de course à pied en France. Carte interactive avec filtres par ville et horaires. Trouvez votre communauté running idéale près de chez vous.`
        : 'Découvrez les clubs de course à pied en France. Carte interactive avec filtres par ville et horaires. Trouvez votre communauté running idéale près de chez vous.'
      : clubs.length > 0
        ? `Discover ${clubs.length} running clubs in France. Interactive map with city and schedule filters. Find your ideal running community near you.`
        : 'Discover running clubs in France. Interactive map with city and schedule filters. Find your ideal running community near you.',
    keywords: language === 'fr'
      ? `clubs course à pied, running clubs France, communauté running, carte clubs running, course à pied ${filterCity ? filterCity + ', ' : ''}sport collectif, entraînement course`
      : `running clubs, running clubs France, running community, running clubs map, running ${filterCity ? filterCity + ', ' : ''}group sports, running training`,
    ogTitle: language === 'fr'
      ? clubs.length > 0
        ? `Carte Interactive des Clubs de Course à Pied | ${clubs.length} Clubs`
        : 'Carte Interactive des Clubs de Course à Pied en France'
      : clubs.length > 0
        ? `Interactive Running Clubs Map | ${clubs.length} Clubs`
        : 'Interactive Running Clubs Map in France',
    ogDescription: language === 'fr'
      ? clubs.length > 0
        ? `Découvrez ${clubs.length} clubs de course à pied en France avec notre carte interactive. Filtres par ville et horaires disponibles.`
        : 'Découvrez les clubs de course à pied en France avec notre carte interactive. Filtres par ville et horaires disponibles.'
      : clubs.length > 0
        ? `Discover ${clubs.length} running clubs in France with our interactive map. City and schedule filters available.`
        : 'Discover running clubs in France with our interactive map. City and schedule filters available.',
    canonicalUrl: `https://run-club-maps.vercel.app/${language === 'en' ? '?lang=en' : ''}`,
    language,
    structuredData: clubStructuredData
  });

  // Hook pour détecter les changements de taille d'écran et le type d'appareil
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fonction pour obtenir le texte traduit d'un club
  const getClubText = (club: RunClubFeature, field: 'name' | 'frequency' | 'description'): string => {
    if (language === 'en') {
      switch (field) {
        case 'name':
          return club.properties.name_en || club.properties.name || '';
        case 'frequency':
          return club.properties.frequency_en || club.properties.frequency || '';
        case 'description':
          return club.properties.description_en || club.properties.description || '';
        default:
          return club.properties[field] || '';
      }
    }
    return club.properties[field] || '';
  };

  // Fonction pour calculer le centre et le zoom optimal
  const calculateMapBounds = (features: RunClubFeature[]) => {
    if (features.length === 0) return;

    if (features.length === 1) {
      // Si un seul point, centrer dessus avec zoom élevé
      const firstFeature = features[0];
      if (firstFeature?.geometry?.coordinates) {
        const coords = firstFeature.geometry.coordinates;
        setMapCenter([coords[1], coords[0]]);
        setMapZoom(10);
      }
      return;
    }

    // Calculer les limites (bounding box)
    const firstFeature = features[0];
    if (!firstFeature?.geometry?.coordinates) return;
    
    let minLat = firstFeature.geometry.coordinates[1];
    let maxLat = firstFeature.geometry.coordinates[1];
    let minLng = firstFeature.geometry.coordinates[0];
    let maxLng = firstFeature.geometry.coordinates[0];

    features.forEach(feature => {
      if (feature?.geometry?.coordinates) {
        const [lng, lat] = feature.geometry.coordinates;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    });

    // Calculer le centre
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    setMapCenter([centerLat, centerLng]);

    // Calculer un zoom approprié basé sur la distance
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 6;
    if (maxDiff < 0.1) zoom = 12;
    else if (maxDiff < 0.5) zoom = 10;
    else if (maxDiff < 1) zoom = 8;
    else if (maxDiff < 2) zoom = 7;
    else if (maxDiff < 5) zoom = 6;
    else zoom = 5;
    
    setMapZoom(zoom);
  };

  // Fonction pour ajuster la vue de la carte en fonction des clubs filtrés
  const adjustMapToFilteredClubs = useCallback((filteredClubsToAdjust: RunClubFeature[]) => {
    if (mapRef.current && filteredClubsToAdjust.length > 0) {
      const map = mapRef.current;
      
      if (filteredClubsToAdjust.length === 1) {
        // Un seul club : centrer avec zoom élevé
        const firstClub = filteredClubsToAdjust[0];
        if (firstClub?.geometry?.coordinates) {
          const coords = firstClub.geometry.coordinates;
          map.setView([coords[1], coords[0]], 14, { animate: true, duration: 1 });
        }
      } else {
        // Plusieurs clubs : calculer les limites et ajuster la vue
        const validClubs = filteredClubsToAdjust.filter(club => club?.geometry?.coordinates);
        if (validClubs.length > 0) {
          const bounds = L.latLngBounds(
            validClubs.map(clubItem => [
              clubItem.geometry.coordinates[1], 
              clubItem.geometry.coordinates[0]
            ])
          );
          
          // Ajouter un padding pour que les marqueurs ne soient pas collés aux bords
          const padding = isMobile ? [20, 20] : [50, 50];
          map.fitBounds(bounds, { 
            animate: true, 
            duration: 1,
            padding: padding,
            maxZoom: 15 // Éviter un zoom trop élevé
          });
        }
      }
    } else if (mapRef.current && filteredClubsToAdjust.length === 0) {
      // Aucun club trouvé : revenir à la vue globale
      const map = mapRef.current;
      map.setView([46.5, 2.5], 6, { animate: true, duration: 1 });
    }
  }, [isMobile]);

  useEffect(() => {
    // Utiliser l'API pour récupérer les données depuis Google Sheets
    fetch('/api/runclubs')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Erreur HTTP: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const features = data.features || [];
        setClubs(features);
        calculateMapBounds(features);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Erreur lors du chargement des données depuis Google Sheets:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Particules d'arrière-plan animées */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: `
            radial-gradient(circle at 20% 80%, rgba(255, 107, 53, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(255, 107, 53, 0.08) 0%, transparent 50%)
          `
        }}></div>

        {/* Piste de course circulaire avec coureurs */}
        <div style={{
          position: 'relative',
          marginBottom: '40px',
          zIndex: 2
        }}>
          <svg width="160" height="160" viewBox="0 0 160 160" style={{
            filter: 'drop-shadow(0 15px 35px rgba(0,0,0,0.2))'
          }}>
            {/* Piste de course (cercle extérieur) */}
            <circle
              cx="80"
              cy="80"
              r="65"
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="8"
              strokeDasharray="10 5"
              style={{
                animation: 'rotateDash 3s linear infinite'
              }}
            />
            
            {/* Piste intérieure */}
            <circle
              cx="80"
              cy="80"
              r="50"
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="4"
              strokeDasharray="5 3"
              style={{
                animation: 'rotateDash 4s linear infinite reverse'
              }}
            />

            {/* Coureur 1 - Principal */}
            <g style={{
              animation: 'runAroundTrack 3s linear infinite',
              transformOrigin: '80px 80px'
            }}>
              <g transform="translate(145, 80)">
                <circle cx="0" cy="0" r="8" fill="#ff6b35" />
                <text x="0" y="2" textAnchor="middle" fontSize="10" fill="white">🏃‍♂️</text>
              </g>
            </g>

            {/* Coureur 2 - Suiveur */}
            <g style={{
              animation: 'runAroundTrack 3s linear infinite',
              animationDelay: '-1s',
              transformOrigin: '80px 80px'
            }}>
              <g transform="translate(145, 80)">
                <circle cx="0" cy="0" r="7" fill="#f7931e" />
                <text x="0" y="2" textAnchor="middle" fontSize="9" fill="white">🏃‍♀️</text>
              </g>
            </g>

            {/* Coureur 3 - Troisième */}
            <g style={{
              animation: 'runAroundTrack 3s linear infinite',
              animationDelay: '-2s',
              transformOrigin: '80px 80px'
            }}>
              <g transform="translate(145, 80)">
                <circle cx="0" cy="0" r="6" fill="#4CAF50" />
                <text x="0" y="2" textAnchor="middle" fontSize="8" fill="white">🏃</text>
              </g>
            </g>

            {/* Logo central avec pulsation */}
            <circle
              cx="80"
              cy="80"
              r="25"
              fill="rgba(255, 107, 53, 0.2)"
              style={{
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
            
            {/* Icône de carte au centre */}
            <text x="80" y="88" textAnchor="middle" fontSize="24" fill="#ff6b35">
              🗺️
            </text>

            {/* Points de clubs qui apparaissent */}
            <circle cx="110" cy="50" r="3" fill="#ff6b35" style={{
              animation: 'popInPlace 2s ease-in-out infinite',
              transformOrigin: '110px 50px'
            }} />
            <circle cx="50" cy="110" r="3" fill="#ff6b35" style={{
              animation: 'popInPlace 2s ease-in-out infinite 0.5s',
              transformOrigin: '50px 110px'
            }} />
            <circle cx="110" cy="110" r="3" fill="#ff6b35" style={{
              animation: 'popInPlace 2s ease-in-out infinite 1s',
              transformOrigin: '110px 110px'
            }} />
            <circle cx="50" cy="50" r="3" fill="#ff6b35" style={{
              animation: 'popInPlace 2s ease-in-out infinite 1.5s',
              transformOrigin: '50px 50px'
            }} />
          </svg>
        </div>

        {/* Texte de chargement avec animation */}
        <div style={{
          color: 'white',
          fontSize: '28px',
          fontWeight: '700',
          marginBottom: '12px',
          textAlign: 'center',
          zIndex: 2,
          animation: 'fadeInUp 0.8s ease-out'
        }}>
          {t.loading}
        </div>

        {/* Sous-texte avec émojis animés */}
        <div style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '18px',
          fontWeight: '500',
          textAlign: 'center',
          marginBottom: '40px',
          zIndex: 2,
          animation: 'fadeInUp 0.8s ease-out 0.2s both'
        }}>
          <span style={{ animation: 'bounce 1s ease-in-out infinite' }}>🏃‍♂️</span>
          {' '}
          {language === 'fr' ? 'Recherche des clubs de running...' : 'Finding running clubs...'}
          {' '}
          <span style={{ animation: 'bounce 1s ease-in-out infinite 0.5s' }}>🏃‍♀️</span>
        </div>

        {/* Barre de progression avec style running */}
        <div style={{
          width: '320px',
          height: '6px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '3px',
          overflow: 'hidden',
          zIndex: 2,
          position: 'relative',
          animation: 'fadeInUp 0.8s ease-out 0.4s both'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, #ff6b35, #f7931e, #ff6b35, transparent)',
            animation: 'runningProgress 2.5s ease-in-out infinite'
          }}></div>
          
          {/* Petit coureur qui court sur la barre */}
          <div style={{
            position: 'absolute',
            top: '-8px',
            left: '0',
            fontSize: '16px',
            animation: 'runnerProgress 2.5s ease-in-out infinite'
          }}>
            🏃‍♂️
          </div>
        </div>

        {/* Statistiques animées */}
        <div style={{
          display: 'flex',
          gap: '30px',
          marginTop: '30px',
          zIndex: 2,
          animation: 'fadeInUp 0.8s ease-out 0.6s both'
        }}>
          <div style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#ff6b35',
              animation: 'countUp 2s ease-out infinite'
            }}>
              🏃‍♂️
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {language === 'fr' ? 'Clubs' : 'Clubs'}
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#f7931e',
              animation: 'countUp 2s ease-out infinite 0.3s'
            }}>
              🗺️
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {language === 'fr' ? 'Carte' : 'Map'}
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.8)'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#4CAF50',
              animation: 'countUp 2s ease-out infinite 0.6s'
            }}>
              👥
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              {language === 'fr' ? 'Communauté' : 'Community'}
            </div>
          </div>
        </div>

        {/* Styles CSS intégrés pour les animations running */}
        <style>{`
          @keyframes runAroundTrack {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes rotateDash {
            0% { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: 15; }
          }
          
          @keyframes pulse {
            0%, 100% { 
              transform: scale(1); 
              opacity: 0.8; 
            }
            50% { 
              transform: scale(1.1); 
              opacity: 1; 
            }
          }
          
          @keyframes popInPlace {
            0%, 75% { 
              transform: scale(0); 
              opacity: 0; 
            }
            85% { 
              transform: scale(1.2); 
              opacity: 0.8; 
            }
            95% { 
              transform: scale(1.1); 
              opacity: 1; 
            }
            100% { 
              transform: scale(1); 
              opacity: 1; 
            }
          }
          
          @keyframes runningProgress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          
          @keyframes runnerProgress {
            0% { 
              transform: translateX(0); 
              left: 0;
            }
            50% { 
              transform: translateX(0) scaleX(-1); 
              left: calc(100% - 16px);
            }
            100% { 
              transform: translateX(0); 
              left: 0;
            }
          }
          
          @keyframes bounce {
            0%, 100% { 
              transform: translateY(0); 
            }
            50% { 
              transform: translateY(-8px); 
            }
          }
          
          @keyframes fadeInUp {
            0% { 
              opacity: 0; 
              transform: translateY(30px); 
            }
            100% { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          
          @keyframes countUp {
            0%, 70% { 
              transform: scale(1); 
            }
            85% { 
              transform: scale(1.2); 
            }
            100% { 
              transform: scale(1); 
            }
          }
        `}</style>
      </div>
    );
  }

  // Ajustement automatique de la carte géré par les fonctions de filtrage

  // Filtrer les clubs selon les critères sélectionnés
  const filteredClubs = clubs.filter(club => {
    const cityMatch = !filterCity || club.properties.city?.toLowerCase().includes(filterCity.toLowerCase());
    
    // Filtrage par jour avec support multilingue
    let dayMatch = true;
    if (filterDay) {
      const freq = club.properties.frequency?.toLowerCase() || '';
      const dayMappings = {
        'monday': ['lundi', 'monday'],
        'tuesday': ['mardi', 'tuesday'],
        'wednesday': ['mercredi', 'wednesday'],
        'thursday': ['jeudi', 'thursday'],
        'friday': ['vendredi', 'friday'],
        'saturday': ['samedi', 'saturday'],
        'sunday': ['dimanche', 'sunday']
      };
      
      const searchTerms = dayMappings[filterDay as keyof typeof dayMappings] || [];
      dayMatch = searchTerms.some(term => freq.includes(term));
    }
    
    // Filtrage par recherche textuelle
    let searchMatch = true;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const clubName = getClubText(club, 'name').toLowerCase();
      const clubCity = club.properties.city?.toLowerCase() || '';
      const clubDescription = getClubText(club, 'description').toLowerCase();
      
      searchMatch = clubName.includes(query) || 
                   clubCity.includes(query) || 
                   clubDescription.includes(query);
    }
    
    return cityMatch && dayMatch && searchMatch;
  });

  // Obtenir les villes uniques pour le filtre
  const uniqueCities = [...new Set(clubs.map(club => club.properties.city).filter(Boolean))] as string[];
  
  // Trier les villes par ordre alphabétique
  const sortedUniqueCities = uniqueCities.sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  
  // Obtenir les jours de la semaine uniques pour le filtre
  const uniqueDays = [...new Set(clubs.map(club => {
    if (!club.properties.frequency) return undefined;
    const freq = club.properties.frequency.toLowerCase();
    const days = [];
    
    // Détection en français et anglais
    if (freq.includes('lundi') || freq.includes('monday')) days.push('monday');
    if (freq.includes('mardi') || freq.includes('tuesday')) days.push('tuesday');
    if (freq.includes('mercredi') || freq.includes('wednesday')) days.push('wednesday');
    if (freq.includes('jeudi') || freq.includes('thursday')) days.push('thursday');
    if (freq.includes('vendredi') || freq.includes('friday')) days.push('friday');
    if (freq.includes('samedi') || freq.includes('saturday')) days.push('saturday');
    if (freq.includes('dimanche') || freq.includes('sunday')) days.push('sunday');
    
    return days;
  }).filter(Boolean).flat())] as string[];

  // Trier les jours dans l'ordre de la semaine
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const sortedUniqueDays = uniqueDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

  const clearFilters = () => {
    setFilterCity('');
    setFilterDay('');
    setSearchQuery('');
    
    // Ajuster la carte à la vue globale après effacement des filtres
    setTimeout(() => {
      if (mapRef.current) {
        const map = mapRef.current;
        map.setView([46.5, 2.5], 6, { animate: true, duration: 1 });
      }
    }, 100);
  };

  // Fonctions wrapper pour ajuster automatiquement la carte
  const handleCityFilterChange = (city: string) => {
    setFilterCity(city);
    setTimeout(() => {
      if (mapRef.current && clubs.length > 0) {
        // Calculer les clubs filtrés avec la nouvelle valeur de ville
        const currentFilteredClubs = clubs.filter(club => {
          const cityMatch = !city || club.properties.city?.toLowerCase().includes(city.toLowerCase());
          
          let dayMatch = true;
          if (filterDay) {
            const freq = club.properties.frequency?.toLowerCase() || '';
            const dayMappings = {
              'monday': ['lundi', 'monday'],
              'tuesday': ['mardi', 'tuesday'],
              'wednesday': ['mercredi', 'wednesday'],
              'thursday': ['jeudi', 'thursday'],
              'friday': ['vendredi', 'friday'],
              'saturday': ['samedi', 'saturday'],
              'sunday': ['dimanche', 'sunday']
            };
            
            const searchTerms = dayMappings[filterDay as keyof typeof dayMappings] || [];
            dayMatch = searchTerms.some(term => freq.includes(term));
          }
          
          let searchMatch = true;
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const clubName = getClubText(club, 'name').toLowerCase();
            const clubCity = club.properties.city?.toLowerCase() || '';
            const clubDescription = getClubText(club, 'description').toLowerCase();
            
            searchMatch = clubName.includes(query) || 
                         clubCity.includes(query) || 
                         clubDescription.includes(query);
          }
          
          return cityMatch && dayMatch && searchMatch;
        });

        adjustMapToFilteredClubs(currentFilteredClubs);
      }
    }, 300);
  };

  const handleDayFilterChange = (day: string) => {
    setFilterDay(day);
    setTimeout(() => {
      if (mapRef.current && clubs.length > 0) {
        // Calculer les clubs filtrés avec la nouvelle valeur de jour
        const currentFilteredClubs = clubs.filter(club => {
          const cityMatch = !filterCity || club.properties.city?.toLowerCase().includes(filterCity.toLowerCase());
          
          let dayMatch = true;
          if (day) {
            const freq = club.properties.frequency?.toLowerCase() || '';
            const dayMappings = {
              'monday': ['lundi', 'monday'],
              'tuesday': ['mardi', 'tuesday'],
              'wednesday': ['mercredi', 'wednesday'],
              'thursday': ['jeudi', 'thursday'],
              'friday': ['vendredi', 'friday'],
              'saturday': ['samedi', 'saturday'],
              'sunday': ['dimanche', 'sunday']
            };
            
            const searchTerms = dayMappings[day as keyof typeof dayMappings] || [];
            dayMatch = searchTerms.some(term => freq.includes(term));
          }
          
          let searchMatch = true;
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const clubName = getClubText(club, 'name').toLowerCase();
            const clubCity = club.properties.city?.toLowerCase() || '';
            const clubDescription = getClubText(club, 'description').toLowerCase();
            
            searchMatch = clubName.includes(query) || 
                         clubCity.includes(query) || 
                         clubDescription.includes(query);
          }
          
          return cityMatch && dayMatch && searchMatch;
        });

        adjustMapToFilteredClubs(currentFilteredClubs);
      }
    }, 300);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => {
      if (mapRef.current && clubs.length > 0) {
        // Calculer les clubs filtrés avec la nouvelle valeur de recherche
        const currentFilteredClubs = clubs.filter(club => {
          const cityMatch = !filterCity || club.properties.city?.toLowerCase().includes(filterCity.toLowerCase());
          
          let dayMatch = true;
          if (filterDay) {
            const freq = club.properties.frequency?.toLowerCase() || '';
            const dayMappings = {
              'monday': ['lundi', 'monday'],
              'tuesday': ['mardi', 'tuesday'],
              'wednesday': ['mercredi', 'wednesday'],
              'thursday': ['jeudi', 'thursday'],
              'friday': ['vendredi', 'friday'],
              'saturday': ['samedi', 'saturday'],
              'sunday': ['dimanche', 'sunday']
            };
            
            const searchTerms = dayMappings[filterDay as keyof typeof dayMappings] || [];
            dayMatch = searchTerms.some(term => freq.includes(term));
          }
          
          let searchMatch = true;
          if (query.trim()) {
            const searchTerm = query.toLowerCase().trim();
            const clubName = getClubText(club, 'name').toLowerCase();
            const clubCity = club.properties.city?.toLowerCase() || '';
            const clubDescription = getClubText(club, 'description').toLowerCase();
            
            searchMatch = clubName.includes(searchTerm) || 
                         clubCity.includes(searchTerm) || 
                         clubDescription.includes(searchTerm);
          }
          
          return cityMatch && dayMatch && searchMatch;
        });

        adjustMapToFilteredClubs(currentFilteredClubs);
      }
    }, 300);
  };

  // Fonction pour gérer les clics sur un club
  const handleClubClick = (club: RunClubFeature) => {
    if (mapRef.current) {
      const map = mapRef.current;
      // Utiliser le même format d'ID que dans ClusteredMarkers
      const clubId = `${club.properties.name}-${club.geometry.coordinates[0]}-${club.geometry.coordinates[1]}`;
      
      // Centrer la carte sur le club avec un zoom élevé pour éviter le clustering
      map.setView([club.geometry.coordinates[1], club.geometry.coordinates[0]], 16);
      
      // Définir le club sélectionné pour ouvrir sa popup
      setSelectedClubId(clubId);
      
      // Fermer l'overlay
      setShowOverlay(false);
    }
  };

  return (
    <main style={{ 
      width: '100vw', 
      height: '100vh', 
      position: isMobile ? 'fixed' : 'relative',
      top: 0,
      left: 0,
      overflow: 'hidden',
      animation: 'fadeIn 0.8s ease-out'
    }} role="application" aria-label={language === 'fr' ? 'Carte interactive des clubs de course à pied' : 'Interactive running clubs map'}>
      {/* Interface mobile optimisée */}
      {isMobile ? (
        <>
          {/* Barre de navigation mobile en haut */}
          <header style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(255, 107, 53, 0.2)',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
            height: '50px',
            boxSizing: 'border-box'
          }}>
            {/* Bouton menu et titre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              <button
                onClick={() => setShowOverlay(!showOverlay)}
                style={{
                  backgroundColor: '#ff6b35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 8px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
                  minHeight: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0
                }}
                aria-label={showOverlay ? t.close : t.clubsList}
                aria-expanded={showOverlay}
              >
                <span>{showOverlay ? '✕' : '☰'}</span>
                <span>{filteredClubs.length}/{clubs.length}</span>
              </button>
              
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <h1 style={{
                  margin: '0',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#2d3748',
                  letterSpacing: '-0.2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {t.title}
                </h1>
                <div style={{
                  fontSize: '9px',
                  color: '#ff6b35',
                  fontWeight: '600',
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {t.subtitle}
                </div>
              </div>
            </div>

            {/* Contrôles droite */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} aria-label={language === 'fr' ? 'Navigation principale' : 'Main navigation'}>
              {/* Sélecteur de langue compact */}
              <div style={{
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex'
              }} role="group" aria-label={language === 'fr' ? 'Sélection de langue' : 'Language selection'}>
                <button
                  onClick={() => setLanguage('fr')}
                  style={{
                    padding: '6px 8px',
                    border: 'none',
                    backgroundColor: language === 'fr' ? '#ff6b35' : 'transparent',
                    color: language === 'fr' ? 'white' : '#ff6b35',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '30px',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label="Français"
                  aria-pressed={language === 'fr'}
                >
                  🇫🇷
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  style={{
                    padding: '6px 8px',
                    border: 'none',
                    backgroundColor: language === 'en' ? '#ff6b35' : 'transparent',
                    color: language === 'en' ? 'white' : '#ff6b35',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    minWidth: '30px',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label="English"
                  aria-pressed={language === 'en'}
                >
                  🇬🇧
                </button>
              </div>

              {/* Bouton info compact */}
              <button
                onClick={() => setShowInfoPopup(true)}
                style={{
                  backgroundColor: 'rgba(255, 107, 53, 0.1)',
                  border: '1px solid #ff6b35',
                  borderRadius: '4px',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#ff6b35',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}
                aria-label={t.info}
              >
                ℹ️
              </button>
            </nav>
          </header>

          {/* Overlay mobile plein écran */}
          {showOverlay && (
            <aside style={{
              position: 'fixed',
              top: '50px',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'white',
              zIndex: 999,
              overflow: 'hidden',
              fontFamily: 'Arial, sans-serif',
              display: 'flex',
              flexDirection: 'column'
            }} aria-label={language === 'fr' ? 'Panneau de filtres et liste des clubs' : 'Filters panel and clubs list'}>
              {/* Header des filtres mobile */}
              <header style={{
                padding: '12px',
                background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                color: 'white',
                flexShrink: 0
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <h2 style={{
                    margin: '0',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}>
                    🏃‍♂️ Run Clubs
                  </h2>
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '3px 10px',
                    borderRadius: '15px',
                    fontSize: '13px',
                    fontWeight: 'bold'
                  }} aria-live="polite">
                    {filteredClubs.length}/{clubs.length}
                  </div>
                </div>
                
                {/* Barre de recherche mobile */}
                <div style={{ marginBottom: '10px', position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '14px',
                    color: '#666',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}>
                    🔍
                  </div>
                  <input
                    type="text"
                    placeholder={t.search}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 10px 10px 35px',
                      borderRadius: '6px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      fontSize: '16px', // Évite le zoom sur iOS
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      color: '#333',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange('')}
                      style={{
                        position: 'absolute',
                        right: '6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        fontSize: '14px',
                        color: '#666',
                        cursor: 'pointer',
                        padding: '3px',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* Filtres mobile en grille */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '11px',
                      marginBottom: '4px',
                      opacity: 0.9,
                      fontWeight: '600'
                    }}>
                      {t.city}
                    </label>
                    <select
                      value={filterCity}
                      onChange={(e) => handleCityFilterChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '5px',
                        border: 'none',
                        fontSize: '13px',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: '#333'
                      }}
                    >
                      <option value="">{t.allCities}</option>
                      {sortedUniqueCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '11px',
                      marginBottom: '4px',
                      opacity: 0.9,
                      fontWeight: '600'
                    }}>
                      {t.day}
                    </label>
                    <select
                      value={filterDay}
                      onChange={(e) => handleDayFilterChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '5px',
                        border: 'none',
                        fontSize: '13px',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: '#333'
                      }}
                    >
                      <option value="">{t.all}</option>
                      {sortedUniqueDays.map((day: string) => (
                        <option key={day} value={day}>{t.days[day as keyof typeof t.days]}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bouton effacer mobile */}
                {(filterCity || filterDay || searchQuery) && (
                  <button
                    onClick={clearFilters}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '5px',
                      border: 'none',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ✕ {t.clear}
                  </button>
                )}
              </header>
              
              {/* Liste des clubs mobile avec scroll optimisé */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch', // Scroll fluide sur iOS
                padding: '0 16px 16px 16px'
              }}>
                {filteredClubs.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                    <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>
                      {t.noClubsFound}
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                      {t.tryModifyFilters}
                    </p>
                  </div>
                ) : (
                  filteredClubs.map((club, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleClubClick(club)}
                      style={{
                        padding: '16px',
                        borderBottom: idx < filteredClubs.length - 1 ? '1px solid #eee' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        // Amélioration tactile
                        minHeight: '44px', // Taille minimale tactile
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                      onTouchStart={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onTouchEnd={(e) => setTimeout(() => e.currentTarget.style.backgroundColor = 'white', 150)}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        {club.properties.image && (
                          <img 
                            src={club.properties.image}
                            alt={club.properties.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #ff6b35',
                              flexShrink: 0
                            }}
                          />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{
                            margin: '0',
                            fontSize: '16px',
                            color: '#ff6b35',
                            fontWeight: 'bold',
                            lineHeight: '1.2'
                          }}>
                            {getClubText(club, 'name')}
                          </h4>
                          {club.properties.city && (
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              marginTop: '2px'
                            }}>
                              📍 {club.properties.city}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {(club.properties.frequency || club.properties.frequency_en) && (
                        <div style={{
                          fontSize: '13px',
                          color: '#666',
                          padding: '6px 10px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px',
                          display: 'inline-block',
                          alignSelf: 'flex-start'
                        }}>
                          ⏰ {getClubText(club, 'frequency')}
                        </div>
                      )}
                      
                      {(club.properties.description || club.properties.description_en) && (
                        <p style={{
                          margin: '0',
                          fontSize: '14px',
                          color: '#666',
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {getClubText(club, 'description')}
                        </p>
                      )}
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '4px'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: '#999',
                          fontWeight: '500'
                        }}>
                          📍 {t.clickToLocate}
                        </span>
                        {club.properties.social?.website && (
                          <a
                            href={club.properties.social.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: '#ff6b35',
                              textDecoration: 'none',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              padding: '4px 8px',
                              backgroundColor: '#fff5f0',
                              borderRadius: '4px',
                              border: '1px solid #ff6b35'
                            }}
                          >
                            🔗 {t.site}
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Bouton de retour à la carte centré en bas */}
              <div style={{
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px',
                backgroundColor: 'white',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'center',
                zIndex: 10
              }}>
                <button
                  onClick={() => setShowOverlay(false)}
                  style={{
                    backgroundColor: '#ff6b35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(255, 107, 53, 0.3)',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '200px',
                    justifyContent: 'center'
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                    e.currentTarget.style.backgroundColor = '#e55a2b';
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = '#ff6b35';
                  }}
                >
                  <span>🗺️</span>
                  <span>{t.backToMap}</span>
                </button>
              </div>
            </aside>
          )}
        </>
      ) : (
        <>
          {/* Titre du site en haut à droite */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            alignItems: 'flex-end',
            maxWidth: 'calc(100vw - 20px)'
          }}>
            {/* Titre du site */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              padding: '16px 20px',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.2)',
              minWidth: 'fit-content'
            }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Logo SCE */}
                <img 
                  src="/SCE-logo.png" 
                  alt="Sport Club Explorer Logo"
                  style={{
                    width: '40px',
                    height: '40px',
                    objectFit: 'contain',
                    flexShrink: 0,
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                  }}
                  onError={(e) => {
                    console.log('❌ Erreur de chargement du logo SCE:', e);
                    // Fallback en cas d'erreur
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                
                {/* Titre et sous-titre */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{
                    margin: '0',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#2d3748',
                    letterSpacing: '-0.3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {t.title}
                  </h1>
                  <div style={{
                    fontSize: '10px',
                    color: '#ff6b35',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase'
                  }}>
                    {t.subtitle}
                  </div>
                </div>
              </div>
            </div>

            {/* Sélecteur de langue */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '8px',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 107, 53, 0.2)',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setLanguage('fr')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: language === 'fr' ? '#ff6b35' : 'transparent',
                  color: language === 'fr' ? 'white' : '#666',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🇫🇷 FR
              </button>
              <button
                onClick={() => setLanguage('en')}
                style={{
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: language === 'en' ? '#ff6b35' : 'transparent',
                  color: language === 'en' ? 'white' : '#666',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🇬🇧 EN
              </button>
            </div>

            {/* Bouton d'information amélioré */}
            <button
              onClick={() => setShowInfoPopup(true)}
              title={t.info}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '2px solid #ff6b35',
                borderRadius: '12px',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(255, 107, 53, 0.2)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: '#ff6b35',
                fontWeight: 'bold',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ff6b35';
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.4)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.borderColor = '#ff6b35';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 107, 53, 0.2)';
                e.currentTarget.style.color = '#ff6b35';
                e.currentTarget.style.borderColor = '#ff6b35';
              }}
            >
              <span style={{
                display: 'inline-block',
                transition: 'transform 0.3s ease'
              }}>
                ℹ️
              </span>
            </button>
          </div>

          {/* Bouton pour ouvrir/fermer l'overlay */}
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              zIndex: 1000,
              backgroundColor: '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              fontFamily: 'Arial, sans-serif'
            }}
          >
            📍 {t.clubsList} ({filteredClubs.length}/{clubs.length})
          </button>

          {/* Overlay desktop existant */}
          {showOverlay && (
            <div style={{
              position: 'absolute',
              top: '70px',
              left: '20px',
              width: '380px',
              maxHeight: '75vh',
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              zIndex: 1000,
              overflow: 'hidden',
              fontFamily: 'Arial, sans-serif',
              border: '1px solid rgba(255, 107, 53, 0.1)'
            }}>
              {/* Header amélioré */}
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                color: 'white'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <h3 style={{
                    margin: '0',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}>
                    🏃‍♂️ Run Clubs
                  </h3>
                  <div style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {filteredClubs.length}/{clubs.length}
                  </div>
                </div>
                
                {/* Barre de recherche */}
                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '16px',
                    color: '#666',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}>
                    🔍
                  </div>
                  <input
                    type="text"
                    placeholder={t.search}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 40px',
                      borderRadius: '8px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      fontSize: '14px',
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      color: '#333',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.6)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        fontSize: '16px',
                        color: '#666',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(0,0,0,0.1)'}
                      onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = 'transparent'}
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {/* Filtres */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: '8px',
                  alignItems: 'end'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      marginBottom: '4px',
                      opacity: 0.9
                    }}>
                      {t.city}
                    </label>
                    <select
                      value={filterCity}
                      onChange={(e) => handleCityFilterChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: '#333'
                      }}
                    >
                      <option value="">{t.allCities}</option>
                      {sortedUniqueCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '12px',
                      marginBottom: '4px',
                      opacity: 0.9
                    }}>
                      {t.day}
                    </label>
                    <select
                      value={filterDay}
                      onChange={(e) => handleDayFilterChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '13px',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: '#333'
                      }}
                    >
                      <option value="">{t.all}</option>
                      {sortedUniqueDays.map((day: string) => (
                        <option key={day} value={day}>{t.days[day as keyof typeof t.days]}</option>
                      ))}
                    </select>
                  </div>
                  
                  {(filterCity || filterDay || searchQuery) && (
                    <button
                      onClick={clearFilters}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      ✕ {t.clear}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Liste des clubs */}
              <div 
                className="clubs-list-container"
                style={{
                  maxHeight: 'calc(75vh - 140px)',
                  overflowY: 'scroll',
                  paddingBottom: '60px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#ff6b35 #f1f1f1'
                }}>
                {filteredClubs.length === 0 ? (
                  <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                    <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold' }}>
                      {t.noClubsFound}
                    </p>
                    <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                      {t.tryModifyFilters}
                    </p>
                  </div>
                ) : (
                  filteredClubs.map((club, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleClubClick(club)}
                      style={{
                        padding: '16px',
                        borderBottom: idx < filteredClubs.length - 1 ? '1px solid #eee' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        {club.properties.image && (
                          <img 
                            src={club.properties.image}
                            alt={club.properties.name}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              marginRight: '10px',
                              objectFit: 'cover',
                              border: '2px solid #ff6b35'
                            }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            margin: '0',
                            fontSize: '16px',
                            color: '#ff6b35',
                            fontWeight: 'bold'
                          }}>
                            {getClubText(club, 'name')}
                          </h4>
                          {club.properties.city && (
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              marginTop: '2px'
                            }}>
                              📍 {club.properties.city}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {(club.properties.frequency || club.properties.frequency_en) && (
                        <div style={{
                          fontSize: '13px',
                          color: '#666',
                          marginBottom: '8px',
                          padding: '4px 8px',
                          backgroundColor: '#f8f9fa',
                          borderRadius: '6px',
                          display: 'inline-block'
                        }}>
                          ⏰ {getClubText(club, 'frequency')}
                        </div>
                      )}
                      
                      {(club.properties.description || club.properties.description_en) && (
                        <p style={{
                          margin: '0 0 8px 0',
                          fontSize: '14px',
                          color: '#666',
                          lineHeight: '1.4'
                        }}>
                          {getClubText(club, 'description')}
                        </p>
                      )}
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          color: '#999'
                        }}>
                          📍 {t.clickToLocate}
                        </span>
                        {club.properties.social?.website && (
                          <a
                            href={club.properties.social.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: '#ff6b35',
                              textDecoration: 'none',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            🔗 {t.site}
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Carte commune aux deux interfaces */}
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={mapZoom}
        style={{ 
          width: '100%', 
          height: '100%'
        }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        {/* Contrôles de zoom en bas à gauche */}
        <ZoomControlBottomLeft />
        
        {/* Gestionnaire de clics pour mobile */}
        <MapClickHandler 
          isMobile={isMobile} 
          showOverlay={showOverlay} 
          setShowOverlay={setShowOverlay} 
        />
        
        {/* Tuiles CartoDB Positron (fond clair et moderne) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        
        {/* Markers avec clustering personnalisé */}
        <ClusteredMarkers clubs={filteredClubs} getClubText={getClubText} t={t} selectedClubId={selectedClubId} />
      </MapContainer>

      {/* Popup d'information sur le projet */}
      {showInfoPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            // Fermer le popup si on clique sur l'arrière-plan (pas sur le contenu)
            if (e.target === e.currentTarget) {
              setShowInfoPopup(false);
            }
          }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: isMobile ? '100%' : '500px',
            width: '100%',
            maxHeight: isMobile ? '90vh' : '80vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            position: 'relative'
          }}>
            {/* Header du popup amélioré */}
            <div style={{
              background: `
                linear-gradient(135deg, rgba(255, 107, 53, 0.85) 0%, rgba(247, 147, 30, 0.85) 50%, rgba(255, 140, 66, 0.85) 100%),
                url('/header-background.jpg') center/cover no-repeat
              `,
              color: 'white',
              padding: '32px 24px',
              borderRadius: '16px 16px 0 0',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <button
                onClick={() => setShowInfoPopup(false)}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  width: '36px',
                  height: '36px',
                  color: 'white',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  fontWeight: 'bold',
                  zIndex: 10
                }}
              >
                ✕
              </button>
              
              <div style={{
                position: 'relative',
                zIndex: 5,
                marginBottom: '12px'
              }}>
                <h2 style={{
                  margin: '0 0 12px 0',
                  fontSize: '28px',
                  fontWeight: '800',
                  letterSpacing: '-0.5px',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  Sport Club Explorer
                </h2>
                <p style={{
                  margin: '0',
                  fontSize: '16px',
                  opacity: 0.95,
                  fontWeight: '500',
                  letterSpacing: '0.3px'
                }}>
                  {t.aboutProject}
                </p>
              </div>
            </div>

            {/* Contenu du popup */}
            <div style={{ padding: '24px' }}>
              {/* Description du projet */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#333'
                }}>
                  {t.projectDescription}
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#666'
                }}>
                  {t.projectGoal}
                </p>
              </div>

              {/* Comment ça marche */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#ff6b35'
                }}>
                  {t.howItWorks}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[t.step1, t.step2, t.step3, t.step4].map((step, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: '#ff6b35',
                        color: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        flexShrink: 0
                      }}>
                        {index + 1}
                      </div>
                      <span style={{
                        fontSize: '14px',
                        color: '#333'
                      }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section contribution */}
              <div style={{
                backgroundColor: '#fff5f0',
                border: '2px solid #ff6b35',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '8px'
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#ff6b35',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🤝</span>
                  {t.contribute}
                </h3>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#666'
                }}>
                  {t.contributeText}
                </p>
                <button
                  onClick={() => {
                    window.open('https://forms.gle/H4r6NMeHp1dtCq1U9', '_blank');
                    setShowInfoPopup(false);
                  }}
                  style={{
                    backgroundColor: '#ff6b35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>➕</span>
                  {t.suggestClub}
                </button>
              </div>

              {/* Section Instagram */}
              <div style={{
                backgroundColor: '#fdf2f8',
                border: '2px solid #E4405F',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '24px'
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#E4405F',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="instagram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="25%" stopColor="#e6683c" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="75%" stopColor="#cc2366" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                    <rect
                      x="2"
                      y="2"
                      width="20"
                      height="20"
                      rx="6"
                      fill="url(#instagram-gradient)"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="4"
                      stroke="white"
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle
                      cx="18"
                      cy="6"
                      r="1.5"
                      fill="white"
                    />
                  </svg>
                  {t.followUs}
                </h3>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#666'
                }}>
                  {t.followUsText}
                </p>
                <button
                  onClick={() => {
                    window.open('https://www.instagram.com/sport_club_explorer/', '_blank');
                    setShowInfoPopup(false);
                  }}
                  style={{
                    backgroundColor: '#E4405F',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#d63384';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#E4405F';
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="instagram-gradient-btn" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f09433" />
                        <stop offset="25%" stopColor="#e6683c" />
                        <stop offset="50%" stopColor="#dc2743" />
                        <stop offset="75%" stopColor="#cc2366" />
                        <stop offset="100%" stopColor="#bc1888" />
                      </linearGradient>
                    </defs>
                    <rect
                      x="2"
                      y="2"
                      width="20"
                      height="20"
                      rx="6"
                      fill="white"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="4"
                      stroke="url(#instagram-gradient-btn)"
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle
                      cx="18"
                      cy="6"
                      r="1.5"
                      fill="url(#instagram-gradient-btn)"
                    />
                  </svg>
                  {t.visitInstagram}
                </button>
              </div>

              {/* Section d'avertissement sur la fiabilité des données */}
              <div style={{
                backgroundColor: '#fff8e1',
                border: '2px solid #ff9800',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '32px',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#f57c00',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠️</span>
                  {t.disclaimer}
                </h3>
                <p style={{
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#5d4e00'
                }}>
                  {t.disclaimerText}
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#5d4e00',
                  fontWeight: '500'
                }}>
                  {t.contactUs}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bouton Effacer les filtres - Mobile uniquement et si filtres actifs */}
      {isMobile && !showOverlay && (filterCity || filterDay || searchQuery.trim()) && (
        <button
          onClick={clearFilters}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1001,
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '25px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.4)',
            transition: 'all 0.2s ease',
            fontFamily: 'Arial, sans-serif',
            minHeight: '44px',
            minWidth: '160px'
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.backgroundColor = '#e55a2b';
            e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)';
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.backgroundColor = '#ff6b35';
            e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
          }}
          aria-label={t.clearFilters}
        >
          🗑️ {t.clearFilters}
        </button>
      )}

      {/* Bouton Trouve ton club - Mobile uniquement et si aucun filtre actif */}
      {isMobile && !showOverlay && !filterCity && !filterDay && !searchQuery.trim() && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Bouton Suggérer un club */}
          <button
            onClick={() => window.open('https://forms.gle/H4r6NMeHp1dtCq1U9', '_blank')}
            style={{
              backgroundColor: '#f7931e',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(247, 147, 30, 0.4)',
              transition: 'all 0.2s ease',
              fontFamily: 'Arial, sans-serif',
              minHeight: '44px',
              minWidth: '140px'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.backgroundColor = '#e6831a';
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.backgroundColor = '#f7931e';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label={t.suggestClub}
          >
            ➕ {t.suggestClub}
          </button>

          {/* Bouton Trouve ton club */}
          <button
            onClick={() => setShowOverlay(true)}
            style={{
              backgroundColor: '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.4)',
              transition: 'all 0.2s ease',
              fontFamily: 'Arial, sans-serif',
              minHeight: '44px',
              minWidth: '140px'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.backgroundColor = '#e55a2b';
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.backgroundColor = '#ff6b35';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label={t.findYourClub}
          >
            🔍 {t.findYourClub}
          </button>
        </div>
      )}

      {/* Bouton Trouve ton club - Desktop uniquement et si aucun filtre actif */}
      {!isMobile && !filterCity && !filterDay && !searchQuery.trim() && (
        <button
          onClick={() => setShowOverlay(true)}
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            zIndex: 1001,
            backgroundColor: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 6px 20px rgba(255, 107, 53, 0.4)',
            transition: 'all 0.3s ease',
            fontFamily: 'Arial, sans-serif',
            minWidth: '180px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e55a2b';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ff6b35';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 53, 0.4)';
          }}
          aria-label={t.findYourClub}
        >
          🔍 {t.findYourClub}
        </button>
      )}

      {/* Bouton Suggérer un club - Desktop uniquement */}
      {!isMobile && (
        <button
          onClick={() => window.open('https://forms.gle/H4r6NMeHp1dtCq1U9', '_blank')}
          style={{
            position: 'fixed',
            bottom: '35px',
            right: '20px',
            zIndex: 1001,
            backgroundColor: '#f7931e',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 6px 20px rgba(247, 147, 30, 0.4)',
            transition: 'all 0.3s ease',
            fontFamily: 'Arial, sans-serif',
            minWidth: '180px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e6831a';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(247, 147, 30, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f7931e';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(247, 147, 30, 0.4)';
          }}
          aria-label={t.suggestClub}
        >
          ➕ {t.suggestClub}
        </button>
      )}

      {/* Styles CSS globaux pour les animations et l'adaptation mobile */}
      <style>{`
        /* Empêcher le scroll global sur toutes les plateformes */
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow: hidden;
          position: fixed;
          width: 100%;
        }
        
        #root {
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          position: fixed;
          top: 0;
          left: 0;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Animation pour les marqueurs qui apparaissent */
        .custom-club-icon {
          animation: markerAppear 0.3s ease-out;
          visibility: visible !important;
        }
        
        @keyframes markerAppear {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        /* Masquer les marqueurs en position (0,0) */
        .leaflet-marker-icon[style*="left: 0px; top: 0px"],
        .leaflet-marker-icon[style*="transform: translate3d(0px, 0px, 0px)"] {
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
        
        /* Animation pour les clusters */
        .custom-cluster-icon {
          animation: clusterAppear 0.2s ease-out;
        }
        
        /* Nouveau design de cluster moderne */
        .custom-cluster-icon-modern {
          animation: clusterAppear 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .custom-cluster-icon-modern:hover div:first-child {
          transform: scale(1.1);
          box-shadow: 
            0 12px 40px rgba(255, 107, 53, 0.5),
            0 6px 20px rgba(0, 0, 0, 0.15),
            inset 0 2px 4px rgba(255, 255, 255, 0.4),
            inset 0 -2px 4px rgba(0, 0, 0, 0.1);
        }
        
        @keyframes pulse-ring {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }
        
        @keyframes clusterAppear {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        /* Styles pour la barre de scroll personnalisée */
        .clubs-list-container::-webkit-scrollbar {
          width: 16px;
          display: block !important;
        }
        
        .clubs-list-container::-webkit-scrollbar-track {
          background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 8px;
          margin: 8px 0 100px 0;
          border: 1px solid #dee2e6;
          display: block !important;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .clubs-list-container::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #ff6b35 0%, #e55a2b 50%, #d14d20 100%);
          border-radius: 8px;
          transition: all 0.3s ease;
          min-height: 30px;
          max-height: calc(100% - 200px);
          border: 2px solid #ffffff;
          background-clip: padding-box;
          display: block !important;
          opacity: 1 !important;
          visibility: visible !important;
          margin-bottom: 20px;
          box-shadow: 
            0 2px 8px rgba(255, 107, 53, 0.3),
            0 1px 3px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        
        .clubs-list-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #e55a2b 0%, #d14d20 50%, #b8421a 100%);
          transform: scale(1.02);
          box-shadow: 
            0 4px 12px rgba(255, 107, 53, 0.4),
            0 2px 6px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        /* Améliorations tactiles pour mobile */
        @media (max-width: 768px) {
          /* Empêcher absolument tout scroll sur mobile */
          html, body {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            overflow: hidden !important;
            -webkit-overflow-scrolling: auto !important;
            touch-action: pan-x pan-y !important;
          }
          
          #root {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            overflow: hidden !important;
          }
          
          /* Empêcher le rubber band effect et le bounce sur iOS */
          * {
            -webkit-overflow-scrolling: auto !important;
            overscroll-behavior: none !important;
          }
          
          /* Forcer la carte à occuper l'espace restant */
          .leaflet-container {
            position: fixed !important;
            top: 50px !important;
            left: 0 !important;
            width: 100vw !important;
            height: calc(100vh - 50px) !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Améliorer la taille des zones tactiles */
          button, select, input {
            min-height: 44px;
            min-width: 44px;
          }
          
          /* Éviter le zoom sur les inputs iOS */
          input[type="text"], input[type="search"], select, textarea {
            font-size: 16px !important;
          }
          
          /* Améliorer le scroll sur mobile */
          .clubs-list-container {
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
          }
          
          /* Masquer la barre de scroll personnalisée sur mobile */
          .clubs-list-container::-webkit-scrollbar {
            display: none;
          }
          
          /* Utiliser la barre de scroll native sur mobile */
          .clubs-list-container {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          /* Améliorer les interactions tactiles */
          * {
            -webkit-tap-highlight-color: rgba(255, 107, 53, 0.2);
          }
          
          /* Optimiser les transitions pour mobile */
          button, .club-item {
            transition: background-color 0.15s ease, transform 0.15s ease;
          }
          
          /* Améliorer la lisibilité sur mobile */
          body {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
        }
        
        /* Styles spécifiques pour tablettes */
        @media (min-width: 769px) and (max-width: 1024px) {
          /* Adapter l'interface pour tablettes */
          .clubs-list-container {
            max-width: 420px;
          }
        }
        
        /* Améliorer la croix de fermeture des pop-ups sur toutes les plateformes */
        .leaflet-popup-close-button {
          width: 36px !important;
          height: 36px !important;
          font-size: 18px !important;
          font-weight: bold !important;
          line-height: 34px !important;
          background-color: rgba(255, 107, 53, 0.1) !important;
          color: #ff6b35 !important;
          border-radius: 50% !important;
          border: 2px solid rgba(255, 107, 53, 0.3) !important;
          top: 8px !important;
          right: 8px !important;
          text-align: center !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
          transition: all 0.2s ease !important;
          z-index: 1000 !important;
        }
        
        .leaflet-popup-close-button:hover,
        .leaflet-popup-close-button:active {
          background-color: #ff6b35 !important;
          color: white !important;
          transform: scale(1.1) !important;
          border-color: #ff6b35 !important;
        }
        
        /* Améliorer la zone tactile globale */
        .leaflet-popup-close-button::before {
          content: '';
          position: absolute;
          top: -5px;
          left: -5px;
          right: -5px;
          bottom: -5px;
          z-index: -1;
        }
        
        /* Améliorer encore plus la croix sur mobile */
        @media (max-width: 768px) {
          .leaflet-popup-close-button {
            width: 40px !important;
            height: 40px !important;
            font-size: 20px !important;
            line-height: 38px !important;
          }
        }
      `}</style>
    </main>
  );
} 