import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { useSEO, useClubStructuredData } from './hooks/useSEO';
import { cacheService, CACHE_KEYS, CACHE_OPTIONS, type CachedClubData } from './services/cacheService';
import { useCache } from './hooks/useCache';

export interface RunClubFeature {
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

// Calcule la distance à vol d'oiseau (en km) entre deux points GPS (formule de Haversine)
const haversineDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

// Construit un lien Google Maps pour obtenir l'itinéraire vers un club
const buildDirectionsUrl = (
  destinationLat: number,
  destinationLng: number,
  origin: { lat: number; lng: number } | null
): string => {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destinationLat},${destinationLng}`,
    travelmode: 'walking'
  });
  if (origin) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

// Fonction pour créer une icône personnalisée avec l'image du club
const createCustomIcon = (imageUrl: string, clubName: string) => {
  // Fonction pour corriger le chemin de l'image
  const getCorrectImagePath = (imageUrl: string) => {
    if (!imageUrl) return '';

    // Si c'est une URL du site qui pointe vers un fichier PNG/JPG à la racine
    if (imageUrl.includes('run-club-maps.vercel.app/') &&
        (imageUrl.includes('.png') || imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) &&
        !imageUrl.includes('/images/')) {
      const fileName = imageUrl.split('/').pop();
      const correctedPath = `/images/${fileName}`;
      return correctedPath;
    }
    // Si c'est juste un nom de fichier local
    else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/images/')) {
      const correctedPath = `/images/${imageUrl}`;
      return correctedPath;
    } else {
      return imageUrl;
    }
  };

  const correctedImageUrl = getCorrectImagePath(imageUrl);

  return L.divIcon({
    html: `
      <div style="
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 3px solid #FF5500;
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
          onerror="this.style.display='none'; this.parentElement.innerHTML='🏃‍♂️';"
        />
      </div>
    `,
    className: 'custom-club-icon',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
  });
};

// Composant pour afficher la position de l'utilisateur sur la carte
function UserLocationMarker({ position }: { position: { lat: number; lng: number } | null }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!position) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    const icon = L.divIcon({
      html: `
        <div style="position: relative; width: 22px; height: 22px;">
          <div style="
            position: absolute;
            inset: -10px;
            border-radius: 50%;
            background: rgba(255, 77, 28, 0.25);
            animation: pulse-ring 2s infinite ease-out;
          "></div>
          <div style="
            position: absolute;
            inset: 0;
            border-radius: 50%;
            background: #FF5500;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          "></div>
        </div>
      `,
      className: 'user-location-icon',
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([position.lat, position.lng]);
      markerRef.current.setIcon(icon);
    } else {
      markerRef.current = L.marker([position.lat, position.lng], { icon, zIndexOffset: 1000 }).addTo(map);
    }

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [map, position]);

  return null;
}

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
function ClusteredMarkers({ clubs, getClubText, t, selectedClubId, userLocation }: {
  clubs: RunClubFeature[];
  getClubText: (club: RunClubFeature, field: 'name' | 'frequency' | 'description') => string;
  t: any;
  selectedClubId: string | undefined;
  userLocation: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  
  useEffect(() => {
    // Détecter si on est sur mobile pour ajuster le zoom
    const isMobileView = window.innerWidth <= 768;
    
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
              background: linear-gradient(135deg, rgba(255, 77, 28, 0.95) 0%, rgba(247, 147, 30, 0.95) 50%, rgba(255, 140, 66, 0.95) 100%);
              border: 2px solid rgba(255, 255, 255, 0.8);
              box-shadow: 
                0 8px 32px rgba(255, 77, 28, 0.4),
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
                border: 1px solid rgba(255, 77, 28, 0.2);
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
      zoomToBoundsOnClick: false, // Désactivé pour gérer manuellement le zoom
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

    // Gérer manuellement le clic sur les clusters pour un zoom adapté au mobile
    markerClusterGroup.on('clusterclick', function(event: any) {
      const cluster = event.layer;
      const bounds = cluster.getBounds();
      
      // Calculer le padding adapté selon la plateforme
      if (isMobileView) {
        // Sur mobile, ajouter plus de padding en bas pour éviter les boutons
        map.fitBounds(bounds, {
          paddingTopLeft: L.point(20, 80), // Padding pour la barre du haut (50px + marge)
          paddingBottomRight: L.point(20, 120), // Padding pour les boutons du bas (hauteur boutons + marges)
          animate: true,
          duration: 0.5,
          maxZoom: 14 // Zoom moins élevé sur mobile pour éviter d'être trop proche
        });
      } else {
        // Sur desktop, padding standard
        map.fitBounds(bounds, {
          padding: L.point(50, 50),
          animate: true,
          duration: 0.5,
          maxZoom: 15
        });
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

      // Distance jusqu'à l'utilisateur (si sa position est connue) et lien d'itinéraire
      const distanceKm = userLocation ? haversineDistanceKm(userLocation.lat, userLocation.lng, lat, lng) : null;
      const directionsUrl = buildDirectionsUrl(lat, lng, userLocation);

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
          const correctedPath = `/images/${fileName}`;
          return correctedPath;
        }
        // Si c'est juste un nom de fichier local
        else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/images/')) {
          const correctedPath = `/images/${imageUrl}`;
          return correctedPath;
        } else {
          return imageUrl;
        }
      };

      // Créer le contenu du popup
      const popupContent = `
        <div class="min-w-[280px] font-body leading-snug">
          <div class="mb-3 flex items-center gap-3 border-b-2 border-ink-line pb-2.5">
            ${club.properties.image ? `<img src="${getCorrectImagePath(club.properties.image)}" alt="${club.properties.name}" class="h-[50px] w-[50px] shrink-0 rounded-full border-2 border-accent object-cover" />` : ''}
            <div class="min-w-0 flex-1">
              <h3 class="m-0 font-display text-lg font-bold uppercase leading-tight tracking-tight text-paper">${getClubText(club, 'name')}</h3>
              ${distanceKm !== null ? `<span class="text-xs font-bold uppercase tracking-wide text-accent">📍 ${distanceKm < 1 ? Math.round(distanceKm * 1000) + ' m' : distanceKm.toFixed(1) + ' km'}</span>` : ''}
            </div>
          </div>
          <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="mb-3 flex items-center justify-center gap-2 rounded-sm bg-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink no-underline">🧭 ${t.getDirections}</a>
          ${club.properties.city ? `
            <div class="mb-3">
              <h4 class="m-0 mb-1 text-xs font-bold uppercase tracking-wide text-concrete">📍 ${t.city}</h4>
              <p class="m-0 text-sm text-paper">${club.properties.city}</p>
            </div>
          ` : ''}
          ${(club.properties.frequency || club.properties.frequency_en) ? `
            <div class="mb-3">
              <h4 class="m-0 mb-1 text-xs font-bold uppercase tracking-wide text-concrete">⏰ ${t.frequency}</h4>
              <p class="m-0 text-sm text-paper">${getClubText(club, 'frequency')}</p>
            </div>
          ` : ''}
          ${(club.properties.description || club.properties.description_en) ? `
            <div class="mb-3.5">
              <h4 class="m-0 mb-1 text-xs font-bold uppercase tracking-wide text-concrete">📝 ${t.description}</h4>
              <p class="m-0 text-sm leading-snug text-paper">${getClubText(club, 'description')}</p>
            </div>
          ` : ''}
          ${club.properties.social && Object.keys(club.properties.social).length > 0 ? `
            <div>
              <h4 class="m-0 mb-2 text-xs font-bold uppercase tracking-wide text-concrete">🌐 ${t.socialNetworks}</h4>
              <div class="flex flex-wrap gap-2">
                ${club.properties.social.website ? `<a href="${club.properties.social.website}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-sm border border-accent bg-accent px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-ink no-underline">🔗 ${t.site}</a>` : ''}
                ${club.properties.social.instagram ? `<a href="${club.properties.social.instagram}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-sm border border-ink-line px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-paper no-underline">📷 Instagram</a>` : ''}
                ${club.properties.social.facebook ? `<a href="${club.properties.social.facebook}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-sm border border-ink-line px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-paper no-underline">📘 Facebook</a>` : ''}
                ${club.properties.social.tiktok ? `<a href="${club.properties.social.tiktok}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-sm border border-ink-line px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-paper no-underline">🎵 TikTok</a>` : ''}
                ${club.properties.social.whatsapp ? `<a href="${club.properties.social.whatsapp}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-sm border border-ink-line px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-paper no-underline">💬 WhatsApp</a>` : ''}
                ${club.properties.social.strava ? `<a href="${club.properties.social.strava}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded-sm border border-ink-line px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-paper no-underline">🏃 Strava</a>` : ''}
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
  }, [map, clubs, getClubText, t, userLocation]);

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
    getDirections: 'Itinéraire',
    nearMe: 'Près de moi',
    locating: 'Localisation...',
    sortedByDistance: 'Triés par distance',
    locationDenied: 'Localisation refusée. Autorisez l\'accès à votre position pour voir les clubs les plus proches.',
    locationError: 'Impossible de récupérer votre position.',
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
    getDirections: 'Directions',
    nearMe: 'Near me',
    locating: 'Locating...',
    sortedByDistance: 'Sorted by distance',
    locationDenied: 'Location access denied. Allow location access to see the closest clubs.',
    locationError: 'Unable to get your location.',
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

export type Language = 'fr' | 'en';

interface RunClubMapProps {
  language: Language;
  showInfoPopup: boolean;
  setShowInfoPopup: (show: boolean) => void;
}

export default function RunClubMap({ language, showInfoPopup, setShowInfoPopup }: RunClubMapProps) {
  const [clubs, setClubs] = useState<RunClubFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([46.5, 2.5]);
  const [mapZoom, setMapZoom] = useState(6);
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterDay, setFilterDay] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [selectedClubId, setSelectedClubId] = useState<string | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'granted' | 'denied' | 'error'>('idle');
  const mapRef = useRef<any>(null);
  const { cacheStatus, updateCacheStatus } = useCache();

  // Demande la position de l'utilisateur, centre la carte dessus et trie les clubs par distance
  const handleLocateMe = useCallback(() => {
    if (geoStatus === 'loading') return;

    if (userLocation) {
      // Bouton "actif" : un second clic désactive le tri par distance
      setUserLocation(null);
      setGeoStatus('idle');
      return;
    }

    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }

    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setGeoStatus('granted');
        setShowOverlay(true);
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 12, { animate: true, duration: 1 });
        }
      },
      (error) => {
        setGeoStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [geoStatus, userLocation]);

  // Fonction pour obtenir les traductions
  const t = translations[language];

  // Fonction globale pour corriger les chemins d'images
  const getCorrectImagePath = (imageUrl: string) => {
    if (!imageUrl) return '';

    // Si c'est une URL du site qui pointe vers un fichier PNG/JPG à la racine
    if (imageUrl.includes('run-club-maps.vercel.app/') &&
        (imageUrl.includes('.png') || imageUrl.includes('.jpg') || imageUrl.includes('.jpeg')) &&
        !imageUrl.includes('/images/')) {
      const fileName = imageUrl.split('/').pop();
      const correctedPath = `/images/${fileName}`;
      return correctedPath;
    }
    // Si c'est juste un nom de fichier local
    else if (!imageUrl.startsWith('http') && !imageUrl.startsWith('/images/')) {
      const correctedPath = `/images/${imageUrl}`;
      return correctedPath;
    } else {
      return imageUrl;
    }
  };

  // Générer les données structurées pour les clubs
  const clubStructuredData = useClubStructuredData(clubs, language);

  // Hook SEO dynamique
  useSEO({
    title: language === 'fr' 
      ? 'Carte Interactive des Clubs de Course à Pied | Plus de 100 Clubs en France'
      : 'Interactive Running Clubs Map | Over 100 Clubs in France',
    description: language === 'fr'
      ? 'Découvrez plus de 100 clubs de course à pied en France. Carte interactive avec filtres par ville et horaires. Trouvez votre communauté running idéale près de chez vous.'
      : 'Discover over 100 running clubs in France. Interactive map with city and schedule filters. Find your ideal running community near you.',
    keywords: language === 'fr'
      ? `clubs course à pied, running clubs France, communauté running, carte clubs running, course à pied ${filterCity ? filterCity + ', ' : ''}sport collectif, entraînement course`
      : `running clubs, running clubs France, running community, running clubs map, running ${filterCity ? filterCity + ', ' : ''}group sports, running training`,
        ogTitle: language === 'fr'
      ? 'Carte Interactive des Clubs de Course à Pied | Plus de 100 Clubs en France'
      : 'Interactive Running Clubs Map | Over 100 Clubs in France',
    ogDescription: language === 'fr'
      ? 'Découvrez plus de 100 clubs de course à pied en France avec notre carte interactive. Filtres par ville et horaires disponibles.'
      : 'Discover over 100 running clubs in France with our interactive map. City and schedule filters available.',
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
    const loadClubsData = async () => {
      try {
        // 1. Vérifier d'abord le cache
        const cachedData = cacheService.get<CachedClubData>(CACHE_KEYS.RUN_CLUBS, CACHE_OPTIONS.RUN_CLUBS);
        
        if (cachedData) {
          setClubs(cachedData.clubs);
          calculateMapBounds(cachedData.clubs);
          setLoading(false);
          updateCacheStatus();
          return;
        }

        // 2. Pas de cache valide, charger depuis l'API
        const response = await fetch('/api/runclubs');
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        const features = data.features || [];
        
        // 3. Sauvegarder dans le cache
        const dataToCache: CachedClubData = {
          clubs: features,
          fetchedAt: Date.now(),
          count: features.length
        };
        
        cacheService.set(CACHE_KEYS.RUN_CLUBS, dataToCache, CACHE_OPTIONS.RUN_CLUBS);
        
        // 4. Mettre à jour l'interface
        setClubs(features);
        calculateMapBounds(features);
        setLoading(false);
        updateCacheStatus();
        
      } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        setLoading(false);
        
        // En cas d'erreur réseau, essayer de récupérer un ancien cache
        const expiredCache = cacheService.get<CachedClubData>(CACHE_KEYS.RUN_CLUBS, {
          ...CACHE_OPTIONS.RUN_CLUBS,
          ttl: 24 * 60 * 60 * 1000 // Accepter un cache de 24h en cas d'erreur
        });
        
        if (expiredCache) {
          setClubs(expiredCache.clubs);
          calculateMapBounds(expiredCache.clubs);
        }
      }
    };

    // Nettoyer les caches expirés au démarrage
    cacheService.clearExpiredCaches();
    
    // Charger les données
    loadClubsData();
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
        background: 'linear-gradient(135deg, #0e0e0e 0%, #1a1a1a 100%)',
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
            radial-gradient(circle at 20% 80%, rgba(255, 77, 28, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(255, 77, 28, 0.08) 0%, transparent 50%)
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
                <circle cx="0" cy="0" r="8" fill="#FF5500" />
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
                <circle cx="0" cy="0" r="7" fill="#CC4400" />
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
              fill="rgba(255, 77, 28, 0.2)"
              style={{
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
            
            {/* Icône de carte au centre */}
            <text x="80" y="88" textAnchor="middle" fontSize="24" fill="#FF5500">
              🗺️
            </text>

            {/* Points de clubs qui apparaissent */}
            <circle cx="110" cy="50" r="3" fill="#FF5500" style={{
              animation: 'popInPlace 2s ease-in-out infinite',
              transformOrigin: '110px 50px'
            }} />
            <circle cx="50" cy="110" r="3" fill="#FF5500" style={{
              animation: 'popInPlace 2s ease-in-out infinite 0.5s',
              transformOrigin: '50px 110px'
            }} />
            <circle cx="110" cy="110" r="3" fill="#FF5500" style={{
              animation: 'popInPlace 2s ease-in-out infinite 1s',
              transformOrigin: '110px 110px'
            }} />
            <circle cx="50" cy="50" r="3" fill="#FF5500" style={{
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
          fontFamily: '"Space Grotesk", Inter, system-ui, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
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
            background: 'linear-gradient(90deg, transparent, #FF5500, #CC4400, #FF5500, transparent)',
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
              color: '#FF5500',
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
              color: '#CC4400',
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

  // Distance jusqu'à un club depuis la position de l'utilisateur (null si inconnue)
  const getClubDistanceKm = (club: RunClubFeature): number | null => {
    if (!userLocation) return null;
    const [lng, lat] = club.geometry.coordinates;
    if (isNaN(lat) || isNaN(lng)) return null;
    return haversineDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
  };

  const formatDistanceKm = (distanceKm: number): string =>
    distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;

  // Si la position de l'utilisateur est connue, les clubs les plus proches sont affichés en premier
  const sortedFilteredClubs = userLocation
    ? [...filteredClubs].sort((a, b) => (getClubDistanceKm(a) ?? Infinity) - (getClubDistanceKm(b) ?? Infinity))
    : filteredClubs;

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
    <main className="run-club-map-root" style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      animation: 'fadeIn 0.8s ease-out'
    }} role="application" aria-label={language === 'fr' ? 'Carte interactive des clubs de course à pied' : 'Interactive running clubs map'}>
      {/* Interface mobile optimisée */}
      {isMobile && (
        <>
          {/* Barre de navigation mobile en haut */}
          <header className="absolute top-0 left-0 right-0 z-[1000] flex h-[50px] items-center justify-between border-b border-ink-line bg-ink/95 px-3 py-2 font-body shadow-[0_2px_16px_rgba(0,0,0,0.25)] backdrop-blur-md box-border">
            {/* Bouton menu et titre */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                onClick={() => setShowOverlay(!showOverlay)}
                className="flex min-h-[32px] shrink-0 items-center gap-1 rounded-sm bg-accent px-2 py-1.5 text-[11px] font-bold text-ink shadow-[0_2px_10px_rgba(255,77,28,0.35)]"
                aria-label={showOverlay ? t.close : t.clubsList}
                aria-expanded={showOverlay}
              >
                <span>{showOverlay ? '✕' : '☰'}</span>
                <span>{filteredClubs.length}/{clubs.length}</span>
              </button>

              {/* Indicateur de cache compact */}
              {cacheStatus.isFromCache && !isMobile && (
                <div
                  className="flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-sm border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400"
                  title={`Données du cache (${cacheStatus.cacheAge}min)`}
                >
                  💾
                  <span>{cacheStatus.cacheAge}min</span>
                </div>
              )}

            </div>
          </header>

          {/* Overlay mobile plein écran — sorti du contexte d'empilement de la carte
              via un portail, pour couvrir tout l'écran (y compris le header). */}
          {showOverlay && createPortal(
            <aside
              className="fixed inset-0 z-[1000] flex flex-col overflow-hidden bg-ink-soft font-body"
              aria-label={language === 'fr' ? 'Panneau de filtres et liste des clubs' : 'Filters panel and clubs list'}
            >
              {/* Header des filtres mobile */}
              <header className="shrink-0 bg-ink p-3 text-paper">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="m-0 font-display text-base font-semibold uppercase tracking-wide">
                    🏃‍♂️ Run Clubs
                  </h2>
                  <div className="rounded-sm bg-white/10 px-2.5 py-0.5 text-[13px] font-bold text-accent" aria-live="polite">
                    {filteredClubs.length}/{clubs.length}
                  </div>
                </div>

                {/* Géolocalisation : tri des clubs par distance */}
                <button
                  onClick={handleLocateMe}
                  disabled={geoStatus === 'loading'}
                  className={`mb-2.5 flex w-full items-center justify-center gap-1.5 rounded-sm border px-2.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-70 ${
                    userLocation ? 'border-accent bg-accent text-ink' : 'border-white/20 bg-white/10 text-paper'
                  }`}
                >
                  {geoStatus === 'loading' ? `📍 ${t.locating}` : userLocation ? `✕ ${t.sortedByDistance}` : `📍 ${t.nearMe}`}
                </button>
                {(geoStatus === 'denied' || geoStatus === 'error') && (
                  <p className="mb-2.5 text-[11px] leading-snug text-accent">
                    {geoStatus === 'denied' ? t.locationDenied : t.locationError}
                  </p>
                )}

                {/* Barre de recherche mobile */}
                <div className="relative mb-2.5">
                  <div className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-sm text-concrete">
                    🔍
                  </div>
                  <input
                    type="text"
                    placeholder={t.search}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="box-border w-full rounded-sm border border-white/20 bg-surface px-2.5 py-2.5 pl-9 text-base text-paper outline-none focus:border-accent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-sm p-0.5 text-sm text-concrete"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filtres mobile en grille */}
                <div className="mb-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-paper/80">
                      {t.city}
                    </label>
                    <select
                      value={filterCity}
                      onChange={(e) => handleCityFilterChange(e.target.value)}
                      className="w-full rounded-sm border border-white/20 bg-surface p-1.5 text-[13px] text-paper"
                    >
                      <option value="">{t.allCities}</option>
                      {sortedUniqueCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-paper/80">
                      {t.day}
                    </label>
                    <select
                      value={filterDay}
                      onChange={(e) => handleDayFilterChange(e.target.value)}
                      className="w-full rounded-sm border border-white/20 bg-surface p-1.5 text-[13px] text-paper"
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
                    className="w-full rounded-sm border-none bg-white/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-paper"
                  >
                    ✕ {t.clear}
                  </button>
                )}
              </header>
              
              {/* Liste des clubs mobile avec scroll optimisé */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 [-webkit-overflow-scrolling:touch]">
                {filteredClubs.length === 0 ? (
                  <div className="p-10 text-center text-concrete">
                    <div className="mb-4 text-5xl">🔍</div>
                    <p className="m-0 font-display text-base font-bold uppercase tracking-wide text-paper">
                      {t.noClubsFound}
                    </p>
                    <p className="mt-2 mb-0 text-sm">
                      {t.tryModifyFilters}
                    </p>
                  </div>
                ) : (
                  sortedFilteredClubs.map((club, idx) => {
                    const distanceKm = getClubDistanceKm(club);
                    const [clubLng, clubLat] = club.geometry.coordinates;
                    return (
                    <div
                      key={idx}
                      onClick={() => handleClubClick(club)}
                      className={`flex min-h-11 flex-col gap-2 py-4 transition-colors active:bg-ink-line/40 ${idx < sortedFilteredClubs.length - 1 ? 'border-b border-ink-line' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {club.properties.image && (
                          <img
                            src={getCorrectImagePath(club.properties.image)}
                            alt={club.properties.name}
                            className="h-10 w-10 shrink-0 rounded-full border-2 border-accent object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="m-0 font-display text-base font-bold uppercase leading-tight tracking-tight text-paper">
                            {getClubText(club, 'name')}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-concrete">
                            {club.properties.city && <span>📍 {club.properties.city}</span>}
                            {distanceKm !== null && (
                              <span className="font-bold uppercase tracking-wide text-accent">
                                {formatDistanceKm(distanceKm)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {(club.properties.frequency || club.properties.frequency_en) && (
                        <div className="inline-block self-start rounded-sm bg-ink px-2.5 py-1.5 text-[13px] font-medium text-paper">
                          ⏰ {getClubText(club, 'frequency')}
                        </div>
                      )}

                      {(club.properties.description || club.properties.description_en) && (
                        <p className="m-0 line-clamp-2 text-sm leading-snug text-concrete">
                          {getClubText(club, 'description')}
                        </p>
                      )}

                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-concrete">
                          📍 {t.clickToLocate}
                        </span>
                        <div className="flex items-center gap-2">
                          <a
                            href={buildDirectionsUrl(clubLat, clubLng, userLocation)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-sm bg-ink px-2 py-1 text-xs font-bold uppercase tracking-wide text-paper no-underline"
                          >
                            🧭 {t.getDirections}
                          </a>
                          {club.properties.social?.website && (
                            <a
                              href={club.properties.social.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-sm border border-accent px-2 py-1 text-xs font-bold uppercase tracking-wide text-accent no-underline"
                            >
                              🔗 {t.site}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>

              {/* Bouton de retour à la carte centré en bas */}
              <div className="sticky bottom-0 left-0 right-0 z-10 flex justify-center border-t border-ink-line bg-ink-soft p-4">
                <button
                  onClick={() => setShowOverlay(false)}
                  className="flex min-w-[200px] items-center justify-center gap-2 rounded-sm bg-accent px-6 py-3.5 text-base font-bold uppercase tracking-wide text-ink shadow-[0_4px_16px_rgba(255,77,28,0.35)] transition-transform active:scale-95"
                >
                  <span>🗺️</span>
                  <span>{t.backToMap}</span>
                </button>
              </div>
            </aside>,
            document.body
          )}
        </>
      )}

      {/* Sur desktop, panneau de filtres/liste en sidebar permanente à côté de la
          carte (plus de survol flottant) ; sur mobile, seule la carte occupe cette zone. */}
      <div className={isMobile ? 'relative h-full w-full' : 'flex h-full w-full'}>
        {!isMobile && (
          <aside className="flex h-full w-[380px] shrink-0 flex-col overflow-hidden border-r border-ink-line bg-ink-soft font-body">
              {/* Header amélioré */}
              <div className="shrink-0 bg-ink p-5 text-paper">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="m-0 font-display text-xl font-semibold uppercase tracking-wide">
                    🏃‍♂️ Run Clubs
                  </h3>
                  <div className="rounded-sm bg-white/10 px-3 py-1 text-sm font-bold text-accent">
                    {filteredClubs.length}/{clubs.length}
                  </div>
                </div>

                {/* Géolocalisation : tri des clubs par distance */}
                <button
                  onClick={handleLocateMe}
                  disabled={geoStatus === 'loading'}
                  className={`mb-3 flex w-full items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-70 ${
                    userLocation ? 'border-accent bg-accent text-ink' : 'border-white/20 bg-white/10 text-paper hover:bg-white/15'
                  }`}
                >
                  {geoStatus === 'loading' ? `📍 ${t.locating}` : userLocation ? `✕ ${t.sortedByDistance}` : `📍 ${t.nearMe}`}
                </button>
                {(geoStatus === 'denied' || geoStatus === 'error') && (
                  <p className="mb-3 text-[11px] leading-snug text-accent">
                    {geoStatus === 'denied' ? t.locationDenied : t.locationError}
                  </p>
                )}

                {/* Barre de recherche */}
                <div className="relative mb-4">
                  <div className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-base text-concrete">
                    🔍
                  </div>
                  <input
                    type="text"
                    placeholder={t.search}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="box-border w-full rounded-sm border border-white/20 bg-surface px-3 py-2.5 pl-10 text-sm text-paper outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-sm p-1 text-base text-concrete hover:bg-black/10"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filtres */}
                <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-paper/80">
                      {t.city}
                    </label>
                    <select
                      value={filterCity}
                      onChange={(e) => handleCityFilterChange(e.target.value)}
                      className="w-full rounded-sm border border-white/20 bg-surface px-2 py-1.5 text-[13px] text-paper"
                    >
                      <option value="">{t.allCities}</option>
                      {sortedUniqueCities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-paper/80">
                      {t.day}
                    </label>
                    <select
                      value={filterDay}
                      onChange={(e) => handleDayFilterChange(e.target.value)}
                      className="w-full rounded-sm border border-white/20 bg-surface px-2 py-1.5 text-[13px] text-paper"
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
                      className="rounded-sm border-none bg-white/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-paper"
                    >
                      ✕ {t.clear}
                    </button>
                  )}
                </div>
              </div>

              {/* Liste des clubs */}
              <div
                className="clubs-list-container min-h-0 flex-1 [scrollbar-color:#FF5500_#1f1f1f] [scrollbar-width:thin]"
                style={{
                  overflowY: 'scroll',
                  paddingBottom: '16px'
                }}>
                {filteredClubs.length === 0 ? (
                  <div className="p-10 text-center text-concrete">
                    <div className="mb-4 text-5xl">🔍</div>
                    <p className="m-0 font-display text-base font-bold uppercase tracking-wide text-paper">
                      {t.noClubsFound}
                    </p>
                    <p className="mt-2 mb-0 text-sm">
                      {t.tryModifyFilters}
                    </p>
                  </div>
                ) : (
                  sortedFilteredClubs.map((club, idx) => {
                    const distanceKm = getClubDistanceKm(club);
                    const [clubLng, clubLat] = club.geometry.coordinates;
                    return (
                    <div
                      key={idx}
                      onClick={() => handleClubClick(club)}
                      className={`cursor-pointer p-4 transition-colors hover:bg-ink-line/40 ${idx < sortedFilteredClubs.length - 1 ? 'border-b border-ink-line' : ''}`}
                    >
                      <div className="mb-2 flex items-center">
                        {club.properties.image && (
                          <img
                            src={getCorrectImagePath(club.properties.image)}
                            alt={club.properties.name}
                            className="mr-2.5 h-8 w-8 rounded-full border-2 border-accent object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="m-0 font-display text-base font-bold uppercase tracking-tight text-paper">
                            {getClubText(club, 'name')}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-concrete">
                            {club.properties.city && <span>📍 {club.properties.city}</span>}
                            {distanceKm !== null && (
                              <span className="font-bold uppercase tracking-wide text-accent">
                                {formatDistanceKm(distanceKm)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {(club.properties.frequency || club.properties.frequency_en) && (
                        <div className="mb-2 inline-block rounded-sm bg-ink px-2 py-1 text-[13px] font-medium text-paper">
                          ⏰ {getClubText(club, 'frequency')}
                        </div>
                      )}

                      {(club.properties.description || club.properties.description_en) && (
                        <p className="mb-2 mt-0 text-sm leading-snug text-concrete">
                          {getClubText(club, 'description')}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs uppercase tracking-wide text-concrete">
                          📍 {t.clickToLocate}
                        </span>
                        <div className="flex items-center gap-3">
                          <a
                            href={buildDirectionsUrl(clubLat, clubLng, userLocation)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs font-bold uppercase tracking-wide text-paper no-underline"
                          >
                            🧭 {t.getDirections}
                          </a>
                          {club.properties.social?.website && (
                            <a
                              href={club.properties.social.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-bold uppercase tracking-wide text-accent no-underline"
                            >
                              🔗 {t.site}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>
          </aside>
        )}

        <div className="relative h-full min-w-0 flex-1">
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

      {/* Fond de carte sombre — Esri Dark Gray Canvas, sans clé API, cohérent avec la charte noir & orange */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; Esri — Esri, DeLorme, NAVTEQ'
        maxZoom={19}
      />

      {/* Markers avec clustering personnalisé */}
      <ClusteredMarkers
        clubs={filteredClubs}
        getClubText={getClubText}
        t={t}
        selectedClubId={selectedClubId}
        userLocation={userLocation}
      />

      {/* Position de l'utilisateur */}
      <UserLocationMarker position={userLocation} />

      </MapContainer>
        </div>
      </div>

      {/* Popup d'information sur le projet */}
      {showInfoPopup && createPortal(
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
            backgroundColor: '#141414',
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
                linear-gradient(135deg, rgba(255, 77, 28, 0.85) 0%, rgba(247, 147, 30, 0.85) 50%, rgba(255, 140, 66, 0.85) 100%),
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
                  color: '#e5e5e5'
                }}>
                  {t.projectDescription}
                </p>
                <p style={{
                  margin: '0',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#a3a3a3'
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
                  color: '#FF5500'
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
                      backgroundColor: '#1f1f1f',
                      borderRadius: '8px',
                      border: '1px solid #2a2a2a'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        backgroundColor: '#FF5500',
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
                        color: '#e5e5e5'
                      }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section contribution */}
              <div style={{
                backgroundColor: '#ffe4d8',
                border: '2px solid #FF5500',
                borderRadius: '12px',
                padding: '20px',
                marginTop: '8px'
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#FF5500',
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
                  color: '#a3a3a3'
                }}>
                  {t.contributeText}
                </p>
                <button
                  onClick={() => {
                    window.open('https://forms.gle/H4r6NMeHp1dtCq1U9', '_blank');
                    setShowInfoPopup(false);
                  }}
                  style={{
                    backgroundColor: '#FF5500',
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
                  📸
                  {t.followUs}
                </h3>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#a3a3a3'
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
                  📸
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
        </div>,
        document.body
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
            backgroundColor: '#FF5500',
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
            boxShadow: '0 4px 12px rgba(255, 77, 28, 0.4)',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            minHeight: '44px',
            minWidth: '160px'
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.backgroundColor = '#c73a13';
            e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)';
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.backgroundColor = '#FF5500';
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
              backgroundColor: '#CC4400',
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
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              minHeight: '44px',
              minWidth: '140px'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.backgroundColor = '#e6831a';
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.backgroundColor = '#CC4400';
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
              backgroundColor: '#FF5500',
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
              boxShadow: '0 4px 12px rgba(255, 77, 28, 0.4)',
              transition: 'all 0.2s ease',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              minHeight: '44px',
              minWidth: '140px'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.backgroundColor = '#c73a13';
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.backgroundColor = '#FF5500';
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
            backgroundColor: '#FF5500',
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
            boxShadow: '0 6px 20px rgba(255, 77, 28, 0.4)',
            transition: 'all 0.3s ease',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            minWidth: '180px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c73a13';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 77, 28, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FF5500';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 77, 28, 0.4)';
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
            backgroundColor: '#CC4400',
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
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            minWidth: '180px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e6831a';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(247, 147, 30, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#CC4400';
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
        /* La carte vit désormais dans une section de la landing page :
           on ne verrouille plus le scroll de html/body/#root (c'était
           nécessaire quand la carte était toute la page). */
        html, body {
          margin: 0;
          padding: 0;
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
            0 12px 40px rgba(255, 77, 28, 0.5),
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
          background: linear-gradient(180deg, #FF5500 0%, #c73a13 50%, #a8300f 100%);
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
            0 2px 8px rgba(255, 77, 28, 0.3),
            0 1px 3px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }
        
        .clubs-list-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #c73a13 0%, #a8300f 50%, #7a2409 100%);
          transform: scale(1.02);
          box-shadow: 
            0 4px 12px rgba(255, 77, 28, 0.4),
            0 2px 6px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }
        
        /* Améliorations tactiles pour mobile */
        @media (max-width: 768px) {
          /* La section carte elle-même reste fixe pendant qu'on l'utilise
             (évite le rubber-band iOS pendant le pan/zoom), mais elle ne
             capture plus html/body/#root : la page reste scrollable. */
          .run-club-map-root {
            position: relative;
            overflow: hidden;
            touch-action: pan-x pan-y;
          }

          /* Empêcher le rubber band effect et le bounce sur iOS à l'intérieur de la carte */
          .run-club-map-root * {
            -webkit-overflow-scrolling: auto !important;
            overscroll-behavior: contain !important;
          }

          /* Forcer la carte à occuper l'espace restant dans sa section */
          .leaflet-container {
            position: absolute !important;
            top: 50px !important;
            left: 0 !important;
            width: 100% !important;
            height: calc(100% - 50px) !important;
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
            -webkit-tap-highlight-color: rgba(255, 77, 28, 0.2);
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
        
        /* Popups de marqueurs aux couleurs du site : fond sombre, accents orange */
        .leaflet-popup-content-wrapper {
          background: var(--color-ink-soft, #141414) !important;
          color: var(--color-paper, #f5f5f5) !important;
          border-radius: 12px !important;
          border: 1px solid var(--color-ink-line, #262626);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.55) !important;
        }

        .leaflet-popup-content {
          margin: 16px 18px !important;
        }

        .leaflet-popup-tip {
          background: var(--color-ink-soft, #141414) !important;
        }

        /* Améliorer la croix de fermeture des pop-ups sur toutes les plateformes */
        .leaflet-popup-close-button {
          width: 36px !important;
          height: 36px !important;
          font-size: 18px !important;
          font-weight: bold !important;
          line-height: 34px !important;
          background-color: rgba(255, 77, 28, 0.1) !important;
          color: #FF5500 !important;
          border-radius: 50% !important;
          border: 2px solid rgba(255, 77, 28, 0.3) !important;
          top: 8px !important;
          right: 8px !important;
          text-align: center !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
          transition: all 0.2s ease !important;
          z-index: 1000 !important;
        }
        
        .leaflet-popup-close-button:hover,
        .leaflet-popup-close-button:active {
          background-color: #FF5500 !important;
          color: white !important;
          transform: scale(1.1) !important;
          border-color: #FF5500 !important;
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