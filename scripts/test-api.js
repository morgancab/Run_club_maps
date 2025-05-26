// Script de test pour vérifier l'API Google Sheets
async function testAPI() {
  try {
    console.log('🧪 Test de l\'API Google Sheets...');
    
    const response = await fetch('http://localhost:3001/api/runclubs');
    
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