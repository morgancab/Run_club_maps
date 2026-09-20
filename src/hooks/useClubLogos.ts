import { useEffect, useState } from 'react';
import { cacheService, CACHE_KEYS, CACHE_OPTIONS, type CachedClubData } from '../services/cacheService';
import type { RunClubFeature } from '../RunClubMap';

export interface ClubLogo {
  name: string;
  image: string;
  lat: number;
  lng: number;
}

// Échantillon de logos de clubs réels (avec leurs vraies coordonnées) pour
// l'illustration cartographique du Hero. Réutilise le même cache (et la même
// clé) que RunClubMap : si la carte a déjà chargé les clubs (ou l'inverse),
// aucune requête réseau supplémentaire n'est faite ici.
export function useClubLogos(limit = 20): ClubLogo[] {
  const [logos, setLogos] = useState<ClubLogo[]>([]);

  useEffect(() => {
    let cancelled = false;

    const pick = (features: RunClubFeature[]): ClubLogo[] =>
      features
        .filter((f) => !!f.properties.image && Array.isArray(f.geometry?.coordinates))
        .slice(0, limit)
        .map((f) => ({
          name: f.properties.name,
          image: f.properties.image as string,
          // GeoJSON = [longitude, latitude], Leaflet attend [latitude, longitude].
          lng: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
        }));

    const cached = cacheService.get<CachedClubData>(CACHE_KEYS.RUN_CLUBS, CACHE_OPTIONS.RUN_CLUBS);
    if (cached) {
      setLogos(pick(cached.clubs as unknown as RunClubFeature[]));
      return;
    }

    fetch('/api/runclubs')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setLogos(pick(data.features || []));
      })
      .catch(() => {
        // Purement décoratif : un échec silencieux suffit, pas de fallback nécessaire.
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return logos;
}
