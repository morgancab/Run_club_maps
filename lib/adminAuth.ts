import type { VercelRequest } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export type AdminAuthResult = { ok: true } | { ok: false; status: number; error: string };

// Vérifie le token Supabase Auth envoyé par la page /admin (header
// "Authorization: Bearer <access_token>") et s'assure que l'email du compte
// correspond à ADMIN_EMAIL. Une session Supabase valide ne suffit pas : sans
// cette vérification, n'importe quel compte Supabase Auth créé sur le projet
// pourrait accéder aux routes admin.
export async function requireAdmin(req: VercelRequest): Promise<AdminAuthResult> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { ok: false, status: 401, error: 'Non authentifié.' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
    console.error('❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ADMIN_EMAIL manquants côté serveur.');
    return { ok: false, status: 500, error: 'Configuration admin incomplète côté serveur.' };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: 'Session invalide, merci de vous reconnecter.' };
  }

  if (data.user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return { ok: false, status: 403, error: "Ce compte n'est pas autorisé à accéder à l'administration." };
  }

  return { ok: true };
}

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants côté serveur.');
  }
  return createClient(supabaseUrl, serviceRoleKey);
}
