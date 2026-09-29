import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Route publique : "view" depuis la carte principale (ouverture de la popup
// d'un marqueur, voir RunClubMap.tsx), "like" depuis le mode swipe (voir
// ClubSwiper.tsx), et "share" depuis /mon-club quand l'owner copie son lien
// ou télécharge son QR code (voir OwnerShareCard.tsx). Purement statistique
// (voir OwnerDashboard) : pas d'authentification requise, pas de donnée
// sensible en jeu — au pire un visiteur pourrait gonfler artificiellement un
// compteur, ce qui n'a pas d'impact au-delà de la métrique elle-même.
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

  const body = req.body as { clubId?: number; event?: 'view' | 'like' | 'share' };
  const clubId = typeof body.clubId === 'number' ? body.clubId : NaN;
  const validEvents = new Set(['view', 'like', 'share']);

  if (Number.isNaN(clubId) || !body.event || !validEvents.has(body.event)) {
    res.status(400).json({ error: 'Paramètres invalides (clubId, event requis).' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    // Silencieux : un compteur raté ne doit jamais remonter d'erreur visible
    // à un visiteur du site.
    res.status(200).json({ ok: true });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const rpcName =
    body.event === 'view' ? 'increment_view_count' : body.event === 'like' ? 'increment_like_count' : 'increment_share_count';
  const { error } = await supabase.rpc(rpcName, { p_club_id: clubId });

  if (error) {
    console.error(`❌ Échec ${rpcName}:`, error);
  }

  // Répond 200 dans tous les cas : c'est un tracking best-effort, jamais un
  // échec bloquant pour le visiteur.
  res.status(200).json({ ok: true });
}
