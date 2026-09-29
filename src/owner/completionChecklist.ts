import type { OwnerClub } from './types';

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

// Sert de "prochaine action" concrète pour l'owner, indépendamment du trafic
// du site — contrairement aux compteurs de vues/likes, ça reste utile même à
// audience faible.
export function getCompletionChecklist(club: OwnerClub): ChecklistItem[] {
  const hasSocial = Boolean(
    club.instagram || club.facebook || club.website || club.tiktok || club.whatsapp || club.strava
  );
  return [
    { key: 'image', label: 'Logo du club', done: Boolean(club.image) },
    {
      key: 'description',
      label: 'Description (FR et EN)',
      done: Boolean(club.description?.trim()) && Boolean(club.description_en?.trim()),
    },
    {
      key: 'frequency',
      label: 'Fréquence des sorties (FR et EN)',
      done: Boolean(club.frequency?.trim()) && Boolean(club.frequency_en?.trim()),
    },
    { key: 'city', label: 'Ville', done: Boolean(club.city?.trim()) },
    { key: 'social', label: 'Au moins un réseau social', done: hasSocial },
  ];
}
