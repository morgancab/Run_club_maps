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
      linkedin?: string;
    };
    // Traductions optionnelles
    name_en?: string;
  };
}

const auth = new GoogleAuth({
  credentials: JSON.parse(
    readFileSync(path.join(process.cwd(), 'keys/google-service-account.json'), 'utf8')
  ),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

export async function fetchRunClubs(): Promise<RunClubFeature[]> {
  try {
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
      'Feuille1!A2:O',
      'Sheet1!A2:O', 
      'Feuille 1!A2:O',
      'A2:O'
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
      throw new Error('Aucune plage de données valide trouvée dans la Google Sheet');
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
            linkedin: row[13] || '',    // N: linkedin
            tiktok: row[12] || ''       // M: tiktok
          },
        },
      };
    }).filter(Boolean) as RunClubFeature[]; // Filtrer les entrées nulles
  } catch (error) {
    console.error('Erreur lors de la récupération des données Google Sheets:', error);
    throw error;
  }
} 