import { createClient } from '@supabase/supabase-js';

interface RunClubFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    name: string;
    city?: string;
    frequency?: string;
    frequency_en?: string;
    description?: string;
    description_en?: string;
    image?: string;
    social?: {
      website?: string;
      instagram?: string;
      facebook?: string;
      tiktok?: string;
      whatsapp?: string;
      strava?: string;
    };
    // Traductions optionnelles
    name_en?: string;
  };
}

// Ligne telle que stockée dans la table Supabase "clubs" (voir supabase/schema.sql).
interface ClubRow {
  id: number;
  name: string;
  city: string | null;
  frequency: string | null;
  frequency_en: string | null;
  description: string | null;
  description_en: string | null;
  image: string | null;
  latitude: number | null;
  longitude: number | null;
  instagram: string | null;
  facebook: string | null;
  website: string | null;
  tiktok: string | null;
  whatsapp: string | null;
  strava: string | null;
}

let cachedClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  // La clé "anon" suffit ici : la lecture des clubs est publique (voir la
  // policy RLS dans supabase/schema.sql). Ne jamais utiliser la clé
  // "service_role" côté API/lecture publique.
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL et SUPABASE_ANON_KEY doivent être définis (voir env.example).'
    );
  }

  cachedClient = createClient(url, key);
  return cachedClient;
}

function rowToFeature(row: ClubRow): RunClubFeature | null {
  const latitude = row.latitude;
  const longitude = row.longitude;

  if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
    console.warn(`Coordonnées invalides pour le club "${row.name}" (id=${row.id})`);
    return null;
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude], // GeoJSON : [lon, lat]
    },
    properties: {
      name: row.name || '',
      name_en: row.name || '',
      city: row.city || '',
      frequency: row.frequency || '',
      frequency_en: row.frequency_en || '',
      description: row.description || '',
      description_en: row.description_en || '',
      image: row.image || '',
      social: {
        website: row.website || '',
        instagram: row.instagram || '',
        facebook: row.facebook || '',
        tiktok: row.tiktok || '',
        whatsapp: row.whatsapp || '',
        strava: row.strava || '',
      },
    },
  };
}

/**
 * Charge la liste des run clubs depuis Supabase (table "clubs").
 * Remplace l'ancienne lecture Google Sheets (lib/fetchSheet.ts, conservé
 * uniquement pour la migration ponctuelle — voir scripts/migrate-sheet-to-supabase.ts).
 * Le format de retour est identique pour ne rien changer côté API/frontend.
 */
export async function fetchRunClubs(): Promise<RunClubFeature[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    throw new Error(`Erreur Supabase lors de la lecture des clubs: ${error.message}`);
  }

  return ((data as ClubRow[] | null) || [])
    .map(rowToFeature)
    .filter((feature): feature is RunClubFeature => feature !== null);
}
