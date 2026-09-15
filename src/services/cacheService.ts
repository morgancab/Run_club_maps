interface CacheData<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface CacheOptions {
  // Durée de vie en millisecondes (par défaut: 30 minutes)
  ttl?: number;
  // Version du cache pour forcer la mise à jour si la structure change
  version?: string;
}

class CacheService {
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly DEFAULT_VERSION = '1.0.0';

  /**
   * Sauvegarde des données dans le localStorage avec métadonnées
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now(),
        version: options.version || this.DEFAULT_VERSION
      };

      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('⚠️ Erreur lors de la sauvegarde du cache:', error);
      // Si le localStorage est plein, essayer de nettoyer les anciens caches
      this.clearExpiredCaches();
    }
  }

  /**
   * Récupère des données du localStorage avec validation
   */
  get<T>(key: string, options: CacheOptions = {}): T | null {
    try {
      const cachedItem = localStorage.getItem(key);
      if (!cachedItem) {
        return null;
      }

      const cacheData: CacheData<T> = JSON.parse(cachedItem);
      const ttl = options.ttl || this.DEFAULT_TTL;
      const expectedVersion = options.version || this.DEFAULT_VERSION;

      // Vérifier la version
      if (cacheData.version !== expectedVersion) {
        this.remove(key);
        return null;
      }

      // Vérifier l'expiration
      const isExpired = Date.now() - cacheData.timestamp > ttl;
      if (isExpired) {
        this.remove(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.warn('⚠️ Erreur lors de la lecture du cache:', error);
      this.remove(key);
      return null;
    }
  }

  /**
   * Supprime un élément du cache
   */
  remove(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Vérifie si un cache existe et est valide
   */
  has(key: string, options: CacheOptions = {}): boolean {
    return this.get(key, options) !== null;
  }

  /**
   * Nettoie tous les caches expirés
   */
  clearExpiredCaches(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const parsed = JSON.parse(item);
        // Vérifier si c'est un item de cache (a une structure CacheData)
        if (parsed.timestamp && parsed.data && parsed.version) {
          const ttl = this.DEFAULT_TTL;
          const isExpired = Date.now() - parsed.timestamp > ttl;
          if (isExpired) {
            keysToRemove.push(key);
          }
        }
      } catch {
        // Ignorer les items qui ne sont pas des JSON valides
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    const cacheKeys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const parsed = JSON.parse(item);
        // Vérifier si c'est un item de cache
        if (parsed.timestamp && parsed.data && parsed.version) {
          cacheKeys.push(key);
        }
      } catch {
        // Ignorer les items qui ne sont pas des JSON valides
      }
    }

    cacheKeys.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Obtient des statistiques sur le cache
   */
  getStats(): { totalItems: number; totalSize: string; oldestCache: string | null } {
    let totalItems = 0;
    let totalSize = 0;
    let oldestTimestamp = Date.now();
    let oldestCache = null;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const parsed = JSON.parse(item);
        if (parsed.timestamp && parsed.data && parsed.version) {
          totalItems++;
          totalSize += item.length;
          
          if (parsed.timestamp < oldestTimestamp) {
            oldestTimestamp = parsed.timestamp;
            oldestCache = key;
          }
        }
      } catch {
        // Ignorer les items qui ne sont pas des JSON valides
      }
    }

    return {
      totalItems,
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      oldestCache: oldestCache ? `${oldestCache} (${Math.round((Date.now() - oldestTimestamp) / (1000 * 60))} min)` : null
    };
  }
}

// Instance singleton
export const cacheService = new CacheService();

// Types pour les données des clubs
export interface CachedClubData {
  clubs: any[];
  fetchedAt: number;
  count: number;
}

// Clés de cache spécifiques
export const CACHE_KEYS = {
  RUN_CLUBS: 'runclubs-data',
  USER_PREFERENCES: 'user-preferences',
  LAST_FILTERS: 'last-filters'
} as const;

// Options de cache par type de données
export const CACHE_OPTIONS = {
  RUN_CLUBS: {
    ttl: 30 * 60 * 1000, // 30 minutes pour les clubs
    version: '1.0.0'
  },
  USER_PREFERENCES: {
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 jours pour les préférences
    version: '1.0.0'
  },
  LAST_FILTERS: {
    ttl: 24 * 60 * 60 * 1000, // 24 heures pour les filtres
    version: '1.0.0'
  }
} as const; 