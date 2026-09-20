import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, getSupabaseAdminClient } from '../../../lib/adminAuth.js';

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected']);

// Colonnes que la page admin peut modifier via PATCH. Toute autre clé
// présente dans le corps de la requête est ignorée (whitelist explicite,
// pas de "update(body)" direct qui laisserait modifier id/created_at/etc.).
const EDITABLE_FIELDS = [
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
  'status',
] as const;

// Route réservée à la page /admin (voir src/admin/) : pas de CORS, ces appels
// ne sont jamais faits depuis un autre domaine que celui du site lui-même.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const supabase = getSupabaseAdminClient();

  if (req.method === 'GET') {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    let query = supabase.from('clubs').select('*').order('created_at', { ascending: false });
    if (status !== 'all') {
      if (!VALID_STATUSES.has(status)) {
        res.status(400).json({ error: 'Statut invalide.' });
        return;
      }
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ clubs: data });
    return;
  }

  if (req.method === 'PATCH') {
    const body = req.body as Record<string, unknown> & { id?: number };
    if (!body.id) {
      res.status(400).json({ error: 'Paramètre id requis.' });
      return;
    }
    if (body.status !== undefined && !VALID_STATUSES.has(body.status as string)) {
      res.status(400).json({ error: 'Statut invalide.' });
      return;
    }

    const updates: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) {
        updates[field] = body[field];
      }
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'Aucune donnée à mettre à jour.' });
      return;
    }
    if ('name' in updates && (typeof updates.name !== 'string' || !updates.name.trim())) {
      res.status(400).json({ error: 'Le nom du club est requis.' });
      return;
    }

    const { data, error } = await supabase
      .from('clubs')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ club: data });
    return;
  }

  if (req.method === 'DELETE') {
    const idParam = typeof req.query.id === 'string' ? req.query.id : undefined;
    const id = idParam ? Number(idParam) : NaN;
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Paramètre id invalide.' });
      return;
    }
    const { error } = await supabase.from('clubs').delete().eq('id', id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
}
