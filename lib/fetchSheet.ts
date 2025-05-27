import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import path from 'path';

interface RunClubFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
  properties: {
    name: string;
    city?: string;
    frequency?: string;
    frequency_en?: string;
    description?: string;
    description_en?: string;
    image?: string;
    social?: {
      website?: string;
      instagram?: string;
      facebook?: string;
      tiktok?: string;
      whatsapp?: string;
      strava?: string;
    };
    // Traductions optionnelles
    name_en?: string;
  };
}

// Configuration d'authentification Google
let credentials;

if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
  // En production (Vercel), utiliser la variable d'environnement
  try {
    const rawCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    
    // Correction pour Vercel : traiter les caractères d'échappement dans la clé privée
    if (rawCredentials.private_key) {
      rawCredentials.private_key = rawCredentials.private_key.replace(/\\n/g, '\n');
    }
    
    credentials = rawCredentials;
    console.log('✅ Credentials Google chargées depuis les variables d\'environnement');
  } catch (error) {
    console.error('❌ Erreur lors du parsing des credentials Google:', error);
    throw new Error('Format invalide pour GOOGLE_SERVICE_ACCOUNT_KEY. Vérifiez que c\'est un JSON valide.');
  }
} else {
  // En développement local, utiliser le fichier
  try {
    credentials = JSON.parse(
      readFileSync(path.join(process.cwd(), 'keys/google-service-account.json'), 'utf8')
    );
    console.log('✅ Credentials Google chargées depuis le fichier local');
  } catch (error) {
    console.error('❌ Erreur lors du chargement du fichier de credentials:', error);
    throw new Error('Clé de service Google non trouvée. Vérifiez le fichier keys/google-service-account.json ou la variable d\'environnement GOOGLE_SERVICE_ACCOUNT_KEY');
  }
}

const auth = new GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

export async function fetchRunClubs(): Promise<RunClubFeature[]> {
  try {
    console.log('🔐 Initialisation de l\'authentification Google...');
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient as any });

    // D'abord, essayons de récupérer les métadonnées de la feuille
    console.log('🔍 Vérification de la structure de la Google Sheet...');
    
    try {
      const metadata = await sheets.spreadsheets.get({
        spreadsheetId: '1hsOICQY2d527Dah8-rLBlUApPmHgETKPfJxrhKazBhA',
      });
      
      console.log('📋 Feuilles disponibles:', metadata.data.sheets?.map(s => s.properties?.title));
    } catch (metaError) {
      console.warn('⚠️ Impossible de récupérer les métadonnées:', metaError);
    }

    // Essayons différentes plages pour trouver les données
    const possibleRanges = [
      'A2:O',           // Plage simple sans nom de feuille
      'Sheet1!A2:O',    // Nom anglais standard
      'Feuille1!A2:O',  // Nom français
      'Feuille 1!A2:O', // Nom français avec espace
      'A:O',            // Toutes les lignes
      'A1:O'            // Avec en-têtes
    ];

    let res;
    let usedRange = '';

    for (const range of possibleRanges) {
      try {
        console.log(`🔍 Test de la plage: ${range}`);
        res = await sheets.spreadsheets.values.get({
          spreadsheetId: '1hsOICQY2d527Dah8-rLBlUApPmHgETKPfJxrhKazBhA',
          range: range,
        });
        usedRange = range;
        console.log(`✅ Plage trouvée: ${range}`);
        break;
      } catch (rangeError) {
        console.log(`❌ Plage ${range} échouée:`, (rangeError as any).message);
        continue;
      }
    }

    if (!res) {
      console.error('❌ Aucune plage de données valide trouvée dans la Google Sheet');
      console.error('💡 Vérifiez que la Google Sheet est partagée avec le compte de service');
      console.error('💡 Vérifiez que la feuille contient des données dans les colonnes A-O');
      
      // Retourner un tableau vide plutôt que de lever une erreur
      return [];
    }

    const rows = res.data.values;

    if (!rows || rows.length === 0) {
      console.warn('Aucune donnée trouvée dans la Google Sheet');
      return [];
    }

    console.log(`📊 ${rows.length} lignes trouvées dans la plage ${usedRange}`);
    console.log('🔍 Première ligne d\'exemple:', rows[0]);

    // Mapper les lignes vers le format GeoJSON selon la structure réelle
    return rows.map((row, index) => {
      // Structure réelle: H=latitude (index 7), I=longitude (index 8)
      const latitude = parseFloat(row[7]);   // Colonne H
      const longitude = parseFloat(row[8]);  // Colonne I
      
      if (isNaN(longitude) || isNaN(latitude)) {
        console.warn(`Coordonnées invalides à la ligne ${index + 2}:`, {
          latitude: `${row[7]} -> ${latitude}`,
          longitude: `${row[8]} -> ${longitude}`,
          name: row[0]
        });
        return null;
      }

      console.log(`✅ Ligne ${index + 2}: ${row[0]} à [${longitude}, ${latitude}]`);
      console.log(`🔍 Debug colonnes (${row.length} colonnes):`, {
        'N (13)': row[13] || 'vide',
        'O (14)': row[14] || 'vide'
      });

      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [longitude, latitude], // lon, lat
        },
        properties: {
          name: row[0] || '',           // A: name
          name_en: row[0] || '',        // Pas de name_en dans la sheet, on utilise name
          city: row[1] || '',           // B: city
          frequency: row[2] || '',      // C: frequency
          frequency_en: row[3] || '',   // D: frequency_en
          description: row[4] || '',    // E: description
          description_en: row[5] || '', // F: description_en
          image: row[6] || '',          // G: image
          social: {
            website: row[11] || '',     // L: website
            instagram: row[9] || '',    // J: instagram
            facebook: row[10] || '',    // K: facebook
            tiktok: row[12] || '',      // M: tiktok
            whatsapp: row[13] || '',    // N: whatsapp
            strava: row[14] || ''       // O: strava
          },
        },
      };
    }).filter(Boolean) as RunClubFeature[]; // Filtrer les entrées nulles
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des données Google Sheets:', error);
    
    // Informations de debug pour Vercel
    if (process.env.NODE_ENV === 'production') {
      console.error('🔍 Debug Vercel - Variables d\'environnement disponibles:', {
        hasGoogleKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      });
    }
    
    // Diagnostics d'erreur spécifiques
    const errorMessage = (error as any).message || '';
    if (errorMessage.includes('Unable to parse range')) {
      console.error('💡 Problème de plage - Vérifiez que la Google Sheet est partagée');
    } else if (errorMessage.includes('Authentication')) {
      console.error('💡 Problème d\'authentification - Vérifiez GOOGLE_SERVICE_ACCOUNT_KEY');
    } else if (errorMessage.includes('permission')) {
      console.error('💡 Problème de permissions - Partagez la sheet avec le compte de service');
    }
    
    // En cas d'erreur, retourner un tableau vide plutôt que de faire planter l'API
    console.warn('⚠️ Retour d\'un tableau vide en raison de l\'erreur');
    return [];
  }
} 