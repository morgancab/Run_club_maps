import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, getSupabaseAdminClient } from '../../../lib/adminAuth.js';

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected']);

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
    const body = req.body as { id?: number; status?: string };
    if (!body.id || !body.status || !VALID_STATUSES.has(body.status)) {
      res.status(400).json({ error: 'Paramètres invalides (id, status requis).' });
      return;
    }
    const { data, error } = await supabase
      .from('clubs')
      .update({ status: body.status })
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
