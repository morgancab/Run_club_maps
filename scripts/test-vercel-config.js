#!/usr/bin/env node

/**
 * Script de test pour vérifier la configuration Vercel
 * Usage: node scripts/test-vercel-config.js
 */

console.log('🔍 Test de configuration Vercel pour Google Sheets API\n');

// Test 1: Vérification des variables d'environnement
console.log('1️⃣ Vérification des variables d\'environnement...');

const hasGoogleKey = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
console.log(`   GOOGLE_SERVICE_ACCOUNT_KEY: ${hasGoogleKey ? '✅ Définie' : '❌ Manquante'}`);

if (hasGoogleKey) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    // Vérifications de base
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !credentials[field]);
    
    if (missingFields.length === 0) {
      console.log('   ✅ Format JSON valide avec tous les champs requis');
      
      // Test de la clé privée
      if (credentials.private_key.includes('\\n')) {
        console.log('   ⚠️  Clé privée contient des \\n (sera corrigé automatiquement)');
      } else if (credentials.private_key.includes('\n')) {
        console.log('   ✅ Clé privée correctement formatée');
      } else {
        console.log('   ❌ Clé privée semble mal formatée');
      }
      
      console.log(`   📧 Email du compte de service: ${credentials.client_email}`);
      console.log(`   🆔 Project ID: ${credentials.project_id}`);
      
    } else {
      console.log(`   ❌ Champs manquants: ${missingFields.join(', ')}`);
    }
    
  } catch (error) {
    console.log('   ❌ Erreur de parsing JSON:', error.message);
  }
} else {
  console.log('   💡 Pour configurer: Vercel Dashboard > Settings > Environment Variables');
  console.log('   💡 Nom: GOOGLE_SERVICE_ACCOUNT_KEY');
  console.log('   💡 Valeur: Contenu complet du fichier JSON de service account');
}

console.log('\n2️⃣ Informations d\'environnement...');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'non défini'}`);
console.log(`   VERCEL_ENV: ${process.env.VERCEL_ENV || 'non défini'}`);
console.log(`   VERCEL_URL: ${process.env.VERCEL_URL || 'non défini'}`);

// Test 3: Test de connexion Google Sheets (si possible)
console.log('\n3️⃣ Test de connexion Google Sheets...');

if (hasGoogleKey) {
  console.log('   🔄 Tentative de connexion...');
  
  // Import dynamique pour éviter les erreurs si les modules ne sont pas disponibles
  import('../lib/fetchSheet.js')
    .then(({ fetchRunClubs }) => {
      return fetchRunClubs();
    })
    .then((clubs) => {
      console.log(`   ✅ Connexion réussie! ${clubs.length} clubs récupérés`);
      
      if (clubs.length > 0) {
        console.log(`   📍 Premier club: ${clubs[0].properties.name} (${clubs[0].properties.city})`);
      }
    })
    .catch((error) => {
      console.log('   ❌ Erreur de connexion:', error.message);
      
      if (error.message.includes('Unable to parse range')) {
        console.log('   💡 Vérifiez que la Google Sheet est partagée avec le compte de service');
      } else if (error.message.includes('Authentication')) {
        console.log('   💡 Problème d\'authentification - vérifiez la variable GOOGLE_SERVICE_ACCOUNT_KEY');
      }
    });
} else {
  console.log('   ⏭️  Ignoré (variable d\'environnement manquante)');
}

console.log('\n📋 Checklist de déploiement Vercel:');
console.log('   □ Variable GOOGLE_SERVICE_ACCOUNT_KEY configurée');
console.log('   □ Google Sheet partagée avec le compte de service');
console.log('   □ Permissions "Lecteur" accordées au compte de service');
console.log('   □ API Google Sheets activée dans Google Cloud Console');
console.log('   □ Redéploiement effectué après configuration des variables');

console.log('\n🔗 Liens utiles:');
console.log('   • Vercel Dashboard: https://vercel.com/dashboard');
console.log('   • Google Cloud Console: https://console.cloud.google.com/');
console.log('   • Documentation: voir DEPLOYMENT.md');

console.log('\n✨ Test terminé!\n'); 