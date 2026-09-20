// Liste centralisée des colonnes "contenu" de la table clubs, partagée entre
// api/admin/clubs (édition directe), api/owner/edit-requests (proposition par
// le owner) et api/admin/edit-requests (application d'une proposition
// approuvée). Garder une seule source évite que les trois routes divergent
// silencieusement sur ce qui est modifiable.
export const CLUB_CONTENT_FIELDS = [
  'name',
  'city',
  'frequency',
  'frequency_en',
  'description',
  'description_en',
  'image',
  'latitude',
  'longitude',
  'instagram',
  'facebook',
  'website',
  'tiktok',
  'whatsapp',
  'strava',
] as const;
