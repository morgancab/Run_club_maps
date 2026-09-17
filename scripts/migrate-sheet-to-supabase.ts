/**
 * Migration ponctuelle : copie les clubs du Google Sheet vers la table
 * Supabase "clubs" (voir supabase/schema.sql, à exécuter avant ce script).
 *
 * Prérequis dans l'environnement (.env local, jamais commit) :
 *  - GOOGLE_SERVICE_ACCOUNT_KEY (déjà utilisé par lib/fetchSheet.ts)
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY (clé service_role, PAS la clé anon : elle
 *    seule peut contourner la RLS pour écrire. Ne jamais l'exposer côté site.)
 *
 * Usage : npm run migrate:supabase
 * Peut être relancé sans risque : les lignes sont upsertées sur (name, city).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { fetchRunClubs } from '../lib/fetchSheet.js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      '❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans l\'environnement.'
    );
    process.exit(1);
  }

  console.log('📥 Lecture des clubs depuis le Google Sheet...');
  const features = await fetchRunClubs();
  console.log(`   ${features.length} clubs trouvés dans le Sheet.`);

  if (features.length === 0) {
    console.warn('⚠️ Aucun club à migrer. Vérifiez la config Google Sheets avant de continuer.');
    process.exit(1);
  }

  const rows = features.map((feature) => {
    const [longitude, latitude] = feature.geometry.coordinates;
    return {
      name: feature.properties.name,
      city: feature.properties.city || null,
      frequency: feature.properties.frequency || null,
      frequency_en: feature.properties.frequency_en || null,
      description: feature.properties.description || null,
      description_en: feature.properties.description_en || null,
      image: feature.properties.image || null,
      latitude,
      longitude,
      instagram: feature.properties.social?.instagram || null,
      facebook: feature.properties.social?.facebook || null,
      website: feature.properties.social?.website || null,
      tiktok: feature.properties.social?.tiktok || null,
      whatsapp: feature.properties.social?.whatsapp || null,
      strava: feature.properties.social?.strava || null,
    };
  });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('📤 Envoi vers Supabase (upsert sur name + city)...');
  const { data, error } = await supabase
    .from('clubs')
    .upsert(rows, { onConflict: 'name,city' })
    .select('id');

  if (error) {
    console.error('❌ Échec de la migration:', error.message);
    process.exit(1);
  }

  console.log(`✅ ${data?.length ?? rows.length} clubs migrés avec succès vers Supabase.`);
  console.log('   Vous pouvez maintenant vérifier la table "clubs" dans le dashboard Supabase.');
}

main().catch((error) => {
  console.error('❌ Erreur inattendue pendant la migration:', error);
  process.exit(1);
});
