import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface RunClubFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    name: string;
    description?: string;
    url?: string;
  };
}

export default function RunClubMap() {
  const [clubs, setClubs] = useState<RunClubFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    fetch('/data/runclubs.geojson')
      .then((res) => res.json())
      .then((data) => {
        setClubs(data.features || []);
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
        Chargement de la carte...
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

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
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
        📍 Liste des clubs ({clubs.length})
      </button>

      {/* Overlay avec la liste des clubs */}
      {showOverlay && (
        <div style={{
          position: 'absolute',
          top: '70px',
          left: '20px',
          width: '320px',
          maxHeight: '70vh',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000,
          overflow: 'hidden',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #eee',
            backgroundColor: '#f8f9fa'
          }}>
            <h3 style={{
              margin: '0',
              fontSize: '18px',
              color: '#333',
              fontWeight: 'bold'
            }}>
              🏃‍♂️ Run Clubs ({clubs.length})
            </h3>
          </div>
          <div style={{
            maxHeight: 'calc(70vh - 80px)',
            overflowY: 'auto'
          }}>
            {clubs.map((club, idx) => (
              <div
                key={idx}
                onClick={() => handleClubClick(club)}
                                 style={{
                   padding: '16px',
                   borderBottom: idx < clubs.length - 1 ? '1px solid #eee' : 'none',
                   cursor: 'pointer',
                   transition: 'background-color 0.2s'
                 }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <h4 style={{
                  margin: '0 0 6px 0',
                  fontSize: '16px',
                  color: '#ff6b35',
                  fontWeight: 'bold'
                }}>
                  {club.properties.name}
                </h4>
                {club.properties.description && (
                  <p style={{
                    margin: '0 0 8px 0',
                    fontSize: '14px',
                    color: '#666',
                    lineHeight: '1.4'
                  }}>
                    {club.properties.description}
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
                    📍 Cliquer pour localiser
                  </span>
                  {club.properties.url && (
                    <a
                      href={club.properties.url}
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
                      🔗 Site
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <MapContainer
        ref={mapRef}
        center={[46.5, 2.5]}
        zoom={6}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        {/* Tuiles CartoDB Positron (fond clair et moderne) */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        
        {/* Markers pour chaque run club */}
        {clubs.map((feature, idx) => (
          <CircleMarker
            key={idx}
            center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
            radius={12}
            color="#ff6b35"
            fillColor="#ffab91"
            fillOpacity={0.8}
            stroke={true}
            weight={3}
          >
            <Popup>
              <div style={{ 
                minWidth: '220px', 
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1.4'
              }}>
                <h3 style={{ 
                  margin: '0 0 10px 0', 
                  color: '#ff6b35',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  🏃‍♂️ {feature.properties.name}
                </h3>
                {feature.properties.description && (
                  <p style={{ 
                    margin: '0 0 10px 0', 
                    fontSize: '14px',
                    color: '#555'
                  }}>
                    {feature.properties.description}
                  </p>
                )}
                {feature.properties.url && (
                  <a 
                    href={feature.properties.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      color: '#ff6b35', 
                      textDecoration: 'none',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    🔗 Visiter le site
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
} 