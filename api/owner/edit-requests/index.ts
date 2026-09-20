import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireOwner } from '../../../lib/ownerAuth.js';
import { getSupabaseAdminClient } from '../../../lib/adminAuth.js';
import { CLUB_CONTENT_FIELDS } from '../../../lib/clubFields.js';
import { uploadClubLogo } from '../../../lib/imageUpload.js';

// Champs qu'un owner peut proposer de modifier sur SON club. Ni "status" ni
// "owner_email" : un owner ne peut ni s'auto-approuver ni changer
// l'attribution de son club (ça reste un geste admin, voir api/admin/clubs).
const OWNER_EDITABLE_FIELDS = new Set<string>(CLUB_CONTENT_FIELDS);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const auth = await requireOwner(req);
  if (!auth.ok) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const body = req.body as { club_id?: number; changes?: Record<string, unknown>; imageBase64?: string };
  const clubId = body.club_id;
  const changes = body.changes ? { ...body.changes } : undefined;

  if (!clubId || !changes || typeof changes !== 'object') {
    res.status(400).json({ error: 'Paramètres invalides (club_id, changes requis).' });
    return;
  }

  const invalidKeys = Object.keys(changes).filter((key) => !OWNER_EDITABLE_FIELDS.has(key));
  if (invalidKeys.length > 0) {
    res.status(400).json({ error: `Champ(s) non modifiable(s) : ${invalidKeys.join(', ')}` });
    return;
  }

  if ('name' in changes && (typeof changes.name !== 'string' || !changes.name.trim())) {
    res.status(400).json({ error: 'Le nom du club est requis.' });
    return;
  }

  const supabase = getSupabaseAdminClient();

  // Vérifie que le club existe bien et appartient à cet owner AVANT
  // d'accepter la demande : sans ce contrôle, n'importe quel compte
  // authentifié pourrait proposer une modification sur n'importe quel club_id.
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select('id, owner_email')
    .eq('id', clubId)
    .maybeSingle();

  if (clubError) {
    res.status(500).json({ error: clubError.message });
    return;
  }
  if (!club || club.owner_email !== auth.email) {
    res.status(403).json({ error: "Ce club ne vous est pas attribué." });
    return;
  }

  if (body.imageBase64) {
    const uploadResult = await uploadClubLogo(supabase, body.imageBase64, String(changes.name ?? clubId));
    if (uploadResult.error) {
      res.status(400).json({ error: uploadResult.error });
      return;
    }
    changes.image = uploadResult.url;
  }

  // Une seule demande en attente par club : une nouvelle soumission remplace
  // la précédente plutôt que d'en empiler une deuxième.
  const { data: existing, error: existingError } = await supabase
    .from('club_edit_requests')
    .select('id')
    .eq('club_id', clubId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingError) {
    res.status(500).json({ error: existingError.message });
    return;
  }

  if (existing) {
    const { data, error } = await supabase
      .from('club_edit_requests')
      .update({ changes, owner_email: auth.email })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ request: data });
    return;
  }

  const { data, error } = await supabase
    .from('club_edit_requests')
    .insert({ club_id: clubId, owner_email: auth.email, changes, status: 'pending' })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(200).json({ request: data });
}
