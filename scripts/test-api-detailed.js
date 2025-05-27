import http from 'http';

console.log('🧪 Test détaillé de l\'API Google Sheets...');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/runclubs',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.type === 'FeatureCollection') {
        console.log('✅ API accessible');
        console.log(`📊 Type de données: ${response.type}`);
        console.log(`🏃‍♂️ Nombre de clubs: ${response.features.length}`);
        console.log('');
        
        response.features.forEach((club, index) => {
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
          
          // Vérifier si des champs sont vides
          const emptySocial = Object.entries(social).filter(([key, value]) => !value);
          if (emptySocial.length > 0) {
            console.log(`      ❌ Champs vides: ${emptySocial.map(([key]) => key).join(', ')}`);
          }
          
          console.log('');
        });
        
        console.log('🎉 Test détaillé terminé !');
      } else {
        console.error('❌ Format de réponse inattendu:', response);
      }
    } catch (error) {
      console.error('❌ Erreur lors du parsing JSON:', error);
      console.error('📄 Réponse brute:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur de connexion:', error.message);
  console.log('💡 Assurez-vous que l\'API est démarrée avec: npm run dev:api');
});

req.end(); 