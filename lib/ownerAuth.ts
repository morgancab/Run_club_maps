import type { VercelRequest } from '@vercel/node';
import { getSupabaseAdminClient } from './adminAuth.js';

export type OwnerAuthResult = { ok: true; email: string } | { ok: false; status: number; error: string };

// Vérifie le token Supabase Auth envoyé par la page /mon-club. Contrairement
// à requireAdmin, n'importe quel compte authentifié passe cette vérification
// (l'inscription est libre) : c'est l'appelant qui doit ensuite vérifier que
// cet email correspond bien au owner_email du club visé.
export async function requireOwner(req: VercelRequest): Promise<OwnerAuthResult> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { ok: false, status: 401, error: 'Non authentifié.' };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    return { ok: false, status: 401, error: 'Session invalide, merci de vous reconnecter.' };
  }

  return { ok: true, email: data.user.email };
}
