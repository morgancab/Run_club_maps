import { useEffect, useState } from 'react';
import type { UserLocation } from '../utils/geo';

export type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

/**
 * Demande la position de l'utilisateur automatiquement à l'arrivée sur le site
 * (une seule fois, au montage). Partagée par la carte et le mode swipe pour
 * trier les clubs du plus proche au plus loin sans redemander la permission
 * deux fois.
 */
export function useGeolocation() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }

    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setGeoStatus('granted');
      },
      (error) => {
        setGeoStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return { userLocation, geoStatus };
}
