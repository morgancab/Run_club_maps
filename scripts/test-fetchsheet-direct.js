import { fetchRunClubs } from '../lib/fetchSheet.js';

console.log('🧪 Test direct de fetchRunClubs...');

try {
  const clubs = await fetchRunClubs();
  
  console.log(`✅ ${clubs.length} clubs récupérés`);
  console.log('');
  
  clubs.forEach((club, index) => {
    console.log(`📍 ${index + 1}. ${club.properties.name} (${club.properties.city})`);
    console.log(`   📍 Coordonnées: [${club.geometry.coordinates[0]}, ${club.geometry.coordinates[1]}]`);
    
    // Afficher les réseaux sociaux en détail
    console.log('   🌐 Réseaux sociaux:');
    const social = club.properties.social;
    if (social.website) console.log(`      🔗 Website: ${social.website}`);
    if (social.instagram) console.log(`      📷 Instagram: ${social.instagram}`);
    if (social.facebook) console.log(`      📘 Facebook: ${social.facebook}`);
    if (social.tiktok) console.log(`      🎵 TikTok: ${social.tiktok}`);
    if (social.whatsapp) console.log(`      💬 WhatsApp: ${social.whatsapp}`);
    if (social.strava) console.log(`      🏃 Strava: ${social.strava}`);
    
    // Afficher l'ancien champ linkedin s'il existe (pour debug)
    if (social.linkedin) console.log(`      ⚠️ LinkedIn (ancien): ${social.linkedin}`);
    
    console.log('');
  });
  
  console.log('🎉 Test direct terminé !');
} catch (error) {
  console.error('❌ Erreur:', error);
} 