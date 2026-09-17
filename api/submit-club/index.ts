import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Le logo est envoyé en base64 dans le corps JSON plutôt qu'en
// multipart/form-data : ça évite d'ajouter une dépendance de parsing
// multipart côté serveur pour un formulaire simple avec un seul fichier.
const BUCKET = 'club-logos';
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 Mo — reste sous la limite de taille de requête de Vercel une fois encodé en base64
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg']);

interface SubmitClubBody {
  name?: string;
  city?: string;
  frequency?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  instagram?: string;
  facebook?: string;
  website?: string;
  tiktok?: string;
  whatsapp?: string;
  strava?: string;
  imageBase64?: string; // data URL complète : "data:image/png;base64,...."
  // Honeypot anti-spam : un champ que seul un robot remplit. Doit rester vide.
  companyWebsite?: string;
}

function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'club'
  );
}

function extensionFromMimeType(mimeType: string): string {
  return mimeType === 'image/png' ? 'png' : 'jpg';
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants côté serveur.');
    res.status(500).json({ error: "Configuration serveur incomplète, merci de réessayer plus tard." });
    return;
  }

  const body = req.body as SubmitClubBody;

  // Honeypot : un vrai visiteur ne voit ni ne remplit ce champ (masqué en CSS).
  // On répond succès pour ne pas indiquer au robot que sa soumission a échoué.
  if (body.companyWebsite) {
    console.warn('🕵️ Soumission ignorée (honeypot rempli).');
    res.status(200).json({ ok: true });
    return;
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const latitude = typeof body.latitude === 'number' ? body.latitude : NaN;
  const longitude = typeof body.longitude === 'number' ? body.longitude : NaN;

  if (!name) {
    res.status(400).json({ error: 'Le nom du club est requis.' });
    return;
  }
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    res.status(400).json({ error: "Merci de sélectionner une adresse dans les suggestions." });
    return;
  }
  if (!body.imageBase64) {
    res.status(400).json({ error: 'Un logo (PNG ou JPEG) est requis.' });
    return;
  }

  const match = body.imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    res.status(400).json({ error: 'Format de logo invalide.' });
    return;
  }
  const [, mimeType, base64Data] = match;
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    res.status(400).json({ error: 'Le logo doit être un fichier PNG ou JPEG.' });
    return;
  }

  const buffer = Buffer.from(base64Data ?? '', 'base64');
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    res.status(400).json({ error: `Le logo doit faire moins de ${MAX_IMAGE_BYTES / (1024 * 1024)} Mo.` });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const path = `pending-${Date.now()}-${slugify(name)}.${extensionFromMimeType(mimeType)}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: false });

    if (uploadError) {
      throw new Error(`Échec de l'envoi du logo: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error: insertError } = await supabase.from('clubs').insert({
      name,
      city: typeof body.city === 'string' ? body.city.trim() || null : null,
      frequency: typeof body.frequency === 'string' ? body.frequency.trim() || null : null,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      image: publicUrlData.publicUrl,
      latitude,
      longitude,
      instagram: normalizeUrl(body.instagram),
      facebook: normalizeUrl(body.facebook),
      website: normalizeUrl(body.website),
      tiktok: normalizeUrl(body.tiktok),
      whatsapp: normalizeUrl(body.whatsapp),
      strava: normalizeUrl(body.strava),
      status: 'pending',
    });

    if (insertError) {
      throw new Error(`Échec de l'enregistrement du club: ${insertError.message}`);
    }

    console.log(`✅ Nouveau club proposé (en attente de validation) : ${name}`);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('❌ Erreur soumission club:', error);
    res.status(500).json({
      error: "Une erreur est survenue lors de l'envoi. Merci de réessayer.",
    });
  }
}
