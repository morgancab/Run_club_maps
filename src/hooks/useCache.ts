import { useState, useEffect } from 'react';
import { cacheService, CACHE_KEYS, CACHE_OPTIONS } from '../services/cacheService';

interface CacheStatus {
  isFromCache: boolean;
  cacheAge: number; // en minutes
  cacheSize: string;
  totalCachedItems: number;
  lastUpdate: Date | null;
}

export function useCache() {
  const [cacheStatus, setCacheStatus] = useState<CacheStatus>({
    isFromCache: false,
    cacheAge: 0,
    cacheSize: '0 KB',
    totalCachedItems: 0,
    lastUpdate: null
  });

  const updateCacheStatus = () => {
    const stats = cacheService.getStats();
    const cachedClubs = cacheService.get(CACHE_KEYS.RUN_CLUBS, CACHE_OPTIONS.RUN_CLUBS);
    
    if (cachedClubs) {
      const cacheData = localStorage.getItem(CACHE_KEYS.RUN_CLUBS);
      if (cacheData) {
        const parsed = JSON.parse(cacheData);
        const ageMinutes = Math.round((Date.now() - parsed.timestamp) / (1000 * 60));
        
        setCacheStatus({
          isFromCache: true,
          cacheAge: ageMinutes,
          cacheSize: stats.totalSize,
          totalCachedItems: stats.totalItems,
          lastUpdate: new Date(parsed.timestamp)
        });
      }
    } else {
      setCacheStatus({
        isFromCache: false,
        cacheAge: 0,
        cacheSize: stats.totalSize,
        totalCachedItems: stats.totalItems,
        lastUpdate: null
      });
    }
  };

  const clearCache = () => {
    cacheService.clear();
    updateCacheStatus();
  };

  const refreshCache = () => {
    cacheService.remove(CACHE_KEYS.RUN_CLUBS);
    updateCacheStatus();
    // Déclencher un rechargement de la page pour forcer un nouveau fetch
    window.location.reload();
  };

  useEffect(() => {
    updateCacheStatus();
    
    // Mettre à jour le statut toutes les minutes
    const interval = setInterval(updateCacheStatus, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    cacheStatus,
    updateCacheStatus,
    clearCache,
    refreshCache
  };
} 