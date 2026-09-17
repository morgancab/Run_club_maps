// Position de l'utilisateur, partagée entre la carte et le mode swipe.
export interface UserLocation {
  lat: number;
  lng: number;
}

// Calcule la distance à vol d'oiseau (en km) entre deux points GPS (formule de Haversine)
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

// Formate une distance en km pour l'affichage ("299 m" en dessous de 1 km, "2.3 km" au-delà)
export function formatDistanceKm(distanceKm: number): string {
  return distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`;
}
