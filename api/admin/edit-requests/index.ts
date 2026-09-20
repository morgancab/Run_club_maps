import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, getSupabaseAdminClient } from '../../../lib/adminAuth.js';
import { CLUB_CONTENT_FIELDS } from '../../../lib/clubFields.js';

const CONTENT_FIELD_SET = new Set<string>(CLUB_CONTENT_FIELDS);

// Route réservée à la page /admin : liste et traite les demandes de
// modification soumises par les owners depuis /mon-club (voir
// api/owner/edit-requests). Approuver applique "changes" sur la table clubs
// publique ; rejeter n'a aucun effet sur la fiche en ligne.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const supabase = getSupabaseAdminClient();

  if (req.method === 'GET') {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    let query = supabase
      .from('club_edit_requests')
      .select('*, clubs(*)')
      .order('created_at', { ascending: false });
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ requests: data });
    return;
  }

  if (req.method === 'PATCH') {
    const body = req.body as { id?: number; status?: 'approved' | 'rejected' };
    if (!body.id || (body.status !== 'approved' && body.status !== 'rejected')) {
      res.status(400).json({ error: "Paramètres invalides (id, status 'approved'|'rejected' requis)." });
      return;
    }

    const { data: request, error: requestError } = await supabase
      .from('club_edit_requests')
      .select('*')
      .eq('id', body.id)
      .single();

    if (requestError || !request) {
      res.status(404).json({ error: 'Demande introuvable.' });
      return;
    }
    if (request.status !== 'pending') {
      res.status(409).json({ error: 'Cette demande a déjà été traitée.' });
      return;
    }

    if (body.status === 'approved') {
      const changes = request.changes as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(changes)) {
        if (CONTENT_FIELD_SET.has(key)) {
          updates[key] = value;
        }
      }
      if (Object.keys(updates).length > 0) {
        const { error: applyError } = await supabase.from('clubs').update(updates).eq('id', request.club_id);
        if (applyError) {
          res.status(500).json({ error: applyError.message });
          return;
        }
      }
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('club_edit_requests')
      .update({ status: body.status, reviewed_at: new Date().toISOString() })
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      res.status(500).json({ error: updateError.message });
      return;
    }

    res.status(200).json({ request: updatedRequest });
    return;
  }

  res.status(405).json({ error: 'Méthode non autorisée' });
}
