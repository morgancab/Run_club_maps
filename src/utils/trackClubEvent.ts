// Mini-stats pour les owners (voir /mon-club) : "best effort", ne bloque et
// ne casse jamais l'expérience du site si l'appel échoue (pas de retry, pas
// d'affichage d'erreur). "view" vient de la carte principale (ouverture de
// la popup d'un marqueur), "like" du mode swipe — voir RunClubMap.tsx et
// ClubSwiper.tsx respectivement.
export function trackClubEvent(clubId: number | undefined, event: 'view' | 'like'): void {
  if (!clubId) return;
  fetch('/api/track/club', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clubId, event }),
  }).catch(() => {});
}
