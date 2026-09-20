import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireOwner } from '../../../lib/ownerAuth.js';
import { getSupabaseAdminClient } from '../../../lib/adminAuth.js';

// Route réservée à la page /mon-club : renvoie uniquement les clubs dont
// owner_email correspond exactement à l'email du compte authentifié (attribué
// manuellement par l'admin, voir supabase/schema.sql). Un owner ne voit et ne
// peut jamais agir sur les clubs des autres.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireOwner(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const supabase = getSupabaseAdminClient();

  const { data: clubs, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('owner_email', auth.email)
    .order('name', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const clubIds = (clubs ?? []).map((c) => c.id);
  const { data: pendingRequests, error: requestsError } =
    clubIds.length > 0
      ? await supabase.from('club_edit_requests').select('*').in('club_id', clubIds).eq('status', 'pending')
      : { data: [], error: null };

  if (requestsError) {
    res.status(500).json({ error: requestsError.message });
    return;
  }

  const clubsWithPending = (clubs ?? []).map((club) => ({
    ...club,
    pendingRequest: (pendingRequests ?? []).find((r) => r.club_id === club.id) ?? null,
  }));

  res.status(200).json({ clubs: clubsWithPending });
}
