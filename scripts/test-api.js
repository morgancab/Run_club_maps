// Script de test pour vérifier l'API Google Sheets
const https = require('https');
const http = require('http');

async function testAPI() {
  try {
    console.log('🧪 Test de l\'API Google Sheets...');
    
    const response = await new Promise((resolve, reject) => {
      const req = http.get('http://localhost:3001/api/runclubs', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data))
          });
        });
      });
      req.on('error', reject);
    });
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API accessible');
    console.log(`📊 Type de données: ${data.type}`);
    console.log(`🏃‍♂️ Nombre de clubs: ${data.features?.length || 0}`);
    
    if (data.features && data.features.length > 0) {
      console.log('\n📍 Clubs trouvés:');
      data.features.forEach((club, index) => {
        console.log(`  ${index + 1}. ${club.properties.name} (${club.properties.city})`);
        console.log(`     📍 Coordonnées: [${club.geometry.coordinates[0]}, ${club.geometry.coordinates[1]}]`);
      });
    }
    
    console.log('\n🎉 Test réussi ! Les clubs sont accessibles.');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    process.exit(1);
  }
}

testAPI(); 