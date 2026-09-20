export interface OwnerEditRequest {
  id: number;
  club_id: number;
  changes: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface OwnerClub {
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
  status: 'pending' | 'approved' | 'rejected';
  pendingRequest: OwnerEditRequest | null;
}
