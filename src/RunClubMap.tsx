import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const mapRef = useRef<any>(null);

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
          top: '20px',
          right: '20px',
          zIndex: 1000,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          {/* Titre du site */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            border: '1px solid rgba(255, 107, 53, 0.2)'
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
                fontSize: '22px',
                fontWeight: '700',
                color: '#2d3748',
                letterSpacing: '-0.5px'
              }}>
                {t.title}
              </h1>
            </div>
            <div style={{
              fontSize: '13px',
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
            top: '20px',
            left: '20px',
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

              {/* Overlay avec la liste des clubs */}
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
                      fontWeight: 'bold'
                    }}
                  >
                    ✕ {t.clear}
                  </button>
                )}
              </div>
            </div>
            
            {/* Liste des clubs */}
            <div style={{
              maxHeight: 'calc(75vh - 140px)',
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
        
        {/* Tuiles CartoDB Positron (fond clair et moderne) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        
        {/* Markers pour chaque run club */}
        {clubs.map((feature, idx) => (
          <Marker
            key={idx}
            position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
            icon={createCustomIcon(
              feature.properties.image || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=60&h=60&fit=crop&crop=center',
              feature.properties.name
            )}
          >
            <Popup>
              <div style={{ 
                minWidth: '280px', 
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1.4'
              }}>
                {/* Header avec image et nom */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '15px',
                  paddingBottom: '10px',
                  borderBottom: '2px solid #ff6b35'
                }}>
                  {feature.properties.image && (
                    <img 
                      src={feature.properties.image}
                      alt={feature.properties.name}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        marginRight: '12px',
                        objectFit: 'cover',
                        border: '3px solid #ff6b35'
                      }}
                    />
                  )}
                  <h3 style={{ 
                    margin: '0', 
                    color: '#ff6b35',
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    {getClubText(feature, 'name')}
                  </h3>
                </div>

                {/* Section Ville */}
                {feature.properties.city && (
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '14px', 
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      📍 {t.city}
                    </h4>
                    <p style={{ 
                      margin: '0', 
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      {feature.properties.city}
                    </p>
                  </div>
                )}

                {/* Section Fréquence */}
                {(feature.properties.frequency || feature.properties.frequency_en) && (
                  <div style={{ marginBottom: '12px' }}>
                    <h4 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '14px', 
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      ⏰ {t.frequency}
                    </h4>
                    <p style={{ 
                      margin: '0', 
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      {getClubText(feature, 'frequency')}
                    </p>
                  </div>
                )}

                {/* Section Description */}
                {(feature.properties.description || feature.properties.description_en) && (
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '14px', 
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      📝 {t.description}
                    </h4>
                    <p style={{ 
                      margin: '0', 
                      fontSize: '14px',
                      color: '#666',
                      lineHeight: '1.5'
                    }}>
                      {getClubText(feature, 'description')}
                    </p>
                  </div>
                )}

                {/* Section Réseaux sociaux */}
                {feature.properties.social && Object.keys(feature.properties.social).length > 0 && (
                  <div>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '14px', 
                      fontWeight: 'bold',
                      color: '#333'
                    }}>
                      🌐 {t.socialNetworks}
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      {feature.properties.social.website && (
                        <a 
                          href={feature.properties.social.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#ff6b35', 
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            padding: '6px 10px',
                            backgroundColor: '#fff5f0',
                            borderRadius: '12px',
                            border: '1px solid #ff6b35'
                          }}
                        >
                                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            {t.site}
                          </a>
                      )}
                      {feature.properties.social.instagram && (
                        <a 
                          href={feature.properties.social.instagram} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#E4405F', 
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            padding: '6px 10px',
                            backgroundColor: '#fdf2f8',
                            borderRadius: '12px',
                            border: '1px solid #E4405F'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          Instagram
                        </a>
                      )}
                      {feature.properties.social.facebook && (
                        <a 
                          href={feature.properties.social.facebook} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#1877F2', 
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            padding: '6px 10px',
                            backgroundColor: '#eff6ff',
                            borderRadius: '12px',
                            border: '1px solid #1877F2'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook
                        </a>
                      )}
                      {feature.properties.social.tiktok && (
                        <a 
                          href={feature.properties.social.tiktok} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#000000', 
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            padding: '6px 10px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '12px',
                            border: '1px solid #000000'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                          </svg>
                          TikTok
                        </a>
                      )}
                      {feature.properties.social.linkedin && (
                        <a 
                          href={feature.properties.social.linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#0A66C2', 
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            padding: '6px 10px',
                            backgroundColor: '#eff6ff',
                            borderRadius: '12px',
                            border: '1px solid #0A66C2'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
} 