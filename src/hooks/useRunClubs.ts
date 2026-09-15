import { useEffect, useState } from 'react';
import { cacheService, CACHE_KEYS, CACHE_OPTIONS, type CachedClubData } from '../services/cacheService';
import type { RunClubFeature } from '../RunClubMap';

/**
 * Charge la liste des run clubs, en réutilisant le même cache localStorage
 * (clé CACHE_KEYS.RUN_CLUBS) que la carte. Si la carte a déjà chargé les
 * clubs, ce hook les récupère depuis le cache sans nouvelle requête réseau.
 */
export function useRunClubs() {
  const [clubs, setClubs] = useState<RunClubFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const cached = cacheService.get<CachedClubData>(CACHE_KEYS.RUN_CLUBS, CACHE_OPTIONS.RUN_CLUBS);
      if (cached) {
        if (!cancelled) {
          setClubs(cached.clubs as RunClubFeature[]);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch('/api/runclubs');
        if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
        const data = await response.json();
        const features: RunClubFeature[] = data.features || [];

        cacheService.set<CachedClubData>(
          CACHE_KEYS.RUN_CLUBS,
          { clubs: features, fetchedAt: Date.now(), count: features.length },
          CACHE_OPTIONS.RUN_CLUBS
        );

        if (!cancelled) {
          setClubs(features);
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ Erreur lors du chargement des clubs:', err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { clubs, loading, error };
}
