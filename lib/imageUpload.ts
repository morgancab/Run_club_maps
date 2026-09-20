import type { SupabaseClient } from '@supabase/supabase-js';

// Mêmes contraintes que api/submit-club (à garder cohérentes) : bucket de
// stockage des logos, taille et types de fichiers acceptés.
export const CLUB_LOGO_BUCKET = 'club-logos';
export const MAX_LOGO_BYTES = 3 * 1024 * 1024; // 3 Mo
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg']);

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

export type UploadClubLogoResult = { url: string; error?: undefined } | { url?: undefined; error: string };

// Décode un data URL "data:image/png;base64,...." envoyé par le navigateur,
// valide le type/la taille, puis l'envoie dans le bucket de logos. Utilisé
// par api/owner/edit-requests (le owner remplace le logo de son club).
export async function uploadClubLogo(
  supabase: SupabaseClient,
  imageBase64: string,
  fileNameHint: string
): Promise<UploadClubLogoResult> {
  const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return { error: 'Format de logo invalide.' };
  }
  const [, mimeType, base64Data] = match;
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    return { error: 'Le logo doit être un fichier PNG ou JPEG.' };
  }

  const buffer = Buffer.from(base64Data ?? '', 'base64');
  if (buffer.length === 0 || buffer.length > MAX_LOGO_BYTES) {
    return { error: `Le logo doit faire moins de ${MAX_LOGO_BYTES / (1024 * 1024)} Mo.` };
  }

  const path = `owner-${Date.now()}-${slugify(fileNameHint)}.${extensionFromMimeType(mimeType)}`;
  const { error: uploadError } = await supabase.storage
    .from(CLUB_LOGO_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (uploadError) {
    return { error: `Échec de l'envoi du logo : ${uploadError.message}` };
  }

  const { data } = supabase.storage.from(CLUB_LOGO_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
