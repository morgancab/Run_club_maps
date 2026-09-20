import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useClubLogos } from '../hooks/useClubLogos';

const PIN_SIZE = 34;

// Garde la carte alignée si la hauteur du Hero change après le premier rendu
// (ex: police qui finit de charger) — Leaflet ne recalcule pas tout seul sa
// taille interne quand son conteneur change sans resize de la fenêtre.
function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function createHeroPinIcon(imageUrl: string, delaySeconds: number) {
  return L.divIcon({
    className: 'hero-map-pin',
    html: `
      <span class="hero-map-pin-inner" style="animation-delay:${delaySeconds.toFixed(2)}s">
        <img src="${imageUrl}" alt="" onerror="this.parentElement.style.display='none'" />
      </span>
    `,
    iconSize: [PIN_SIZE, PIN_SIZE],
    iconAnchor: [PIN_SIZE / 2, PIN_SIZE / 2],
  });
}

// Fond de carte du Hero : une vraie carte Leaflet (même fond de carte que la
// carte principale, Esri Light Gray Canvas), non interactive, avec les
// logos des clubs positionnés à leurs coordonnées réelles. Purement
// décorative : aucun clic, drag, zoom ni focus clavier possible.
export default function HeroMap() {
  const clubs = useClubLogos(24);

  const markers = useMemo(
    () => clubs.map((club, index) => ({ ...club, icon: createHeroPinIcon(club.image, index * 0.05) })),
    [clubs]
  );

  return (
    // z-0 explicite (pas juste "position: relative") : crée un vrai contexte
    // d'empilement CSS qui contient les z-index internes de Leaflet (panes à
    // 200/400/600/700...). Sans ça, ces z-index positifs "fuient" au-delà de
    // ce conteneur et passent au-dessus du texte du Hero malgré l'ordre du
    // DOM, ni <section> ni .leaflet-container n'ayant de z-index propre.
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <MapContainer
        center={[46.6, 2.4]}
        zoom={6}
        zoomSnap={0.25}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        attributionControl={true}
        className="hero-leaflet-map"
      >
        <ResizeHandler />
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri — Esri, DeLorme, NAVTEQ"
          maxZoom={19}
        />
        {markers.map((club) => (
          <Marker
            key={club.name}
            position={[club.lat, club.lng]}
            icon={club.icon}
            interactive={false}
            keyboard={false}
          />
        ))}
      </MapContainer>
    </div>
  );
}
