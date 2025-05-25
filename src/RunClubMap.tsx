import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

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
      linkedin?: string;
    };
    // Traductions optionnelles
    name_en?: string;
    frequency_en?: string;
    description_en?: string;
  };
}

// Fonction pour créer une icône personnalisée avec l'image du club
const createCustomIcon = (imageUrl: string, clubName: string) => {
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
          src="${imageUrl}" 
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
function ClusteredMarkers({ clubs, getClubText, t }: { 
  clubs: RunClubFeature[]; 
  getClubText: (club: RunClubFeature, field: 'name' | 'frequency' | 'description') => string;
  t: any;
}) {
  const map = useMap();
  
  useEffect(() => {
    // Créer le groupe de clusters
    const markerClusterGroup = (L as any).markerClusterGroup({
      iconCreateFunction: function(cluster: any) {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 50%;
              background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: ${count > 99 ? '12px' : '14px'};
              font-family: Arial, sans-serif;
            ">
              ${count}
            </div>
          `,
          className: 'custom-cluster-icon',
          iconSize: [50, 50],
          iconAnchor: [25, 25]
        });
      },
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true
    });

    // Ajouter les marqueurs au groupe de clusters
    clubs.forEach((club) => {
      const marker = L.marker([club.geometry.coordinates[1], club.geometry.coordinates[0]], {
        icon: createCustomIcon(
          club.properties.image || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=60&h=60&fit=crop&crop=center',
          club.properties.name
        )
      });

      // Créer le contenu du popup
      const popupContent = `
        <div style="min-width: 280px; font-family: Arial, sans-serif; line-height: 1.4;">
          <div style="display: flex; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #ff6b35;">
            ${club.properties.image ? `<img src="${club.properties.image}" alt="${club.properties.name}" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 12px; object-fit: cover; border: 3px solid #ff6b35;" />` : ''}
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
                ${club.properties.social.linkedin ? `<a href="${club.properties.social.linkedin}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px; color: #0A66C2; text-decoration: none; font-size: 13px; font-weight: bold; padding: 6px 10px; background-color: #eff6ff; border-radius: 12px; border: 1px solid #0A66C2;">💼 LinkedIn</a>` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      markerClusterGroup.addLayer(marker);
    });

    // Ajouter le groupe de clusters à la carte
    map.addLayer(markerClusterGroup);

    // Nettoyer lors du démontage
    return () => {
      map.removeLayer(markerClusterGroup);
    };
  }, [map, clubs, getClubText, t]);

  return null;
}

// Système de traduction
const translations = {
  fr: {
    title: 'Social Run Club',
    subtitle: '🗺️ Carte Interactive',
    clubsList: 'Liste des clubs',
    loading: 'Chargement de la carte...',
    city: 'Ville',
    day: 'Jour',
    all: 'Tous',
    allCities: 'Toutes',
    clear: 'Effacer',
    noClubsFound: 'Aucun club trouvé',
    tryModifyFilters: 'Essayez de modifier vos filtres',
    clickToLocate: 'Cliquer pour localiser',
    site: 'Site',
    description: 'Description',
    frequency: 'Fréquence',
    socialNetworks: 'Réseaux sociaux',
    visitSite: 'Visiter le site',
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
    title: 'Social Run Club',
    subtitle: '🗺️ Interactive Maps',
    clubsList: 'Clubs list',
    loading: 'Loading map...',
    city: 'City',
    day: 'Day',
    all: 'All',
    allCities: 'All',
    clear: 'Clear',
    noClubsFound: 'No clubs found',
    tryModifyFilters: 'Try modifying your filters',
    clickToLocate: 'Click to locate',
    site: 'Website',
    description: 'Description',
    frequency: 'Frequency',
    socialNetworks: 'Social Networks',
    visitSite: 'Visit website',
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
  const [language, setLanguage] = useState<Language>('fr');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const mapRef = useRef<any>(null);

  // Hook pour détecter les changements de taille d'écran
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fonction pour obtenir les traductions
  const t = translations[language];

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
      const coords = features[0].geometry.coordinates;
      setMapCenter([coords[1], coords[0]]);
      setMapZoom(10);
      return;
    }

    // Calculer les limites (bounding box)
    let minLat = features[0].geometry.coordinates[1];
    let maxLat = features[0].geometry.coordinates[1];
    let minLng = features[0].geometry.coordinates[0];
    let maxLng = features[0].geometry.coordinates[0];

    features.forEach(feature => {
      const [lng, lat] = feature.geometry.coordinates;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
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

  useEffect(() => {
    fetch('/data/runclubs.geojson')
      .then((res) => res.json())
      .then((data) => {
        const features = data.features || [];
        setClubs(features);
        calculateMapBounds(features);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Erreur lors du chargement du GeoJSON:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif'
      }}>
        {t.loading}
      </div>
    );
  }

  const handleClubClick = (club: RunClubFeature) => {
    if (mapRef.current) {
      const map = mapRef.current;
      map.setView([club.geometry.coordinates[1], club.geometry.coordinates[0]], 12);
      setShowOverlay(false);
    }
  };

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
    
    return cityMatch && dayMatch;
  });

  // Obtenir les villes uniques pour le filtre
  const uniqueCities = [...new Set(clubs.map(club => club.properties.city).filter(Boolean))];
  
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
  };

      return (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
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
            padding: isMobile ? '12px 16px' : '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 107, 53, 0.2)',
            minWidth: 'fit-content'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: '#ff6b35',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }}></div>
              <h1 style={{
                margin: '0',
                fontSize: isMobile ? '18px' : '22px',
                fontWeight: '700',
                color: '#2d3748',
                letterSpacing: '-0.5px'
              }}>
                {t.title}
              </h1>
            </div>
            <div style={{
              fontSize: isMobile ? '11px' : '13px',
              color: '#ff6b35',
              fontWeight: '600',
              textAlign: 'left',
              marginTop: '4px',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>
              {t.subtitle}
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
            padding: isMobile ? '10px 12px' : '12px 16px',
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontFamily: 'Arial, sans-serif',
            maxWidth: isMobile ? '120px' : 'auto',
            whiteSpace: isMobile ? 'nowrap' : 'normal',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {isMobile ? `📍 ${filteredClubs.length}/${clubs.length}` : `📍 ${t.clubsList} (${filteredClubs.length}/${clubs.length})`}
        </button>

              {/* Overlay avec la liste des clubs */}
        {showOverlay && (
          <div style={{
            position: 'absolute',
            top: isMobile ? '60px' : '70px',
            left: isMobile ? '10px' : '20px',
            width: isMobile ? 'calc(100vw - 20px)' : '380px',
            maxWidth: isMobile ? '100vw' : '380px',
            maxHeight: isMobile ? '70vh' : '75vh',
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
              padding: isMobile ? '16px' : '20px',
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
                  fontSize: isMobile ? '18px' : '20px',
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
              
              {/* Filtres */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr auto',
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
                    onChange={(e) => setFilterCity(e.target.value)}
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
                    {uniqueCities.map(city => (
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
                    onChange={(e) => setFilterDay(e.target.value)}
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
                
                {(filterCity || filterDay) && (
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
                      fontWeight: 'bold',
                      gridColumn: isMobile ? '1 / -1' : 'auto',
                      marginTop: isMobile ? '8px' : '0'
                    }}
                  >
                    ✕ {t.clear}
                  </button>
                )}
              </div>
            </div>
            
            {/* Liste des clubs */}
            <div style={{
              maxHeight: isMobile ? 'calc(70vh - 120px)' : 'calc(75vh - 140px)',
              overflowY: 'auto'
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

      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={mapZoom}
        style={{ width: '100%', height: '100%' }}
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
        <ClusteredMarkers clubs={clubs} getClubText={getClubText} t={t} />
      </MapContainer>
    </div>
  );
} 