import { createClient } from '@supabase/supabase-js';

const url = import.meta.env['VITE_SUPABASE_URL'];
const anonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'];

// La clé "anon" est publique par conception (protégée par les policies RLS
// de la table clubs) : l'exposer au navigateur via VITE_ n'est pas un souci
// de sécurité en soi. C'est le contrôle d'accès côté serveur (lib/adminAuth,
// vérification de ADMIN_EMAIL) qui protège réellement les routes /api/admin/*.
export const supabaseAuth = url && anonKey ? createClient(url, anonKey) : null;
