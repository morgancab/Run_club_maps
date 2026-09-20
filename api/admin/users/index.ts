import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin, getSupabaseAdminClient } from '../../../lib/adminAuth.js';

// Route réservée à /admin (onglet "Owners") : renvoie chaque compte owner
// (table app_users, alimentée par triggers depuis auth.users — voir
// supabase/schema.sql) avec ses KPI calculés à la volée : club(s) associé(s)
// et nombre de modifications proposées, en croisant sur owner_email.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const supabase = getSupabaseAdminClient();

  const [usersResult, clubsResult, requestsResult] = await Promise.all([
    supabase.from('app_users').select('*').order('created_at', { ascending: false }),
    supabase.from('clubs').select('name, city, owner_email').not('owner_email', 'is', null),
    supabase.from('club_edit_requests').select('owner_email'),
  ]);

  if (usersResult.error) {
    res.status(500).json({ error: usersResult.error.message });
    return;
  }
  if (clubsResult.error) {
    res.status(500).json({ error: clubsResult.error.message });
    return;
  }
  if (requestsResult.error) {
    res.status(500).json({ error: requestsResult.error.message });
    return;
  }

  const clubs = clubsResult.data ?? [];
  const requests = requestsResult.data ?? [];

  const users = (usersResult.data ?? []).map((user) => ({
    ...user,
    clubs: clubs.filter((c) => c.owner_email === user.email),
    editRequestCount: requests.filter((r) => r.owner_email === user.email).length,
  }));

  res.status(200).json({ users });
}
