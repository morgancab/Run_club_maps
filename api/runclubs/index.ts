import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchRunClubs } from '../../lib/fetchSheet.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permettre CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  try {
    const clubs = await fetchRunClubs();
    
    // Retourner au format GeoJSON
    const geojson = {
      type: 'FeatureCollection',
      features: clubs
    };

    // Ajouter des informations de debug si aucun club n'est trouvé
    if (clubs.length === 0) {
      console.warn('⚠️ Aucun club trouvé - vérifiez la configuration Google Sheets');
    } else {
      console.log(`✅ ${clubs.length} clubs récupérés avec succès`);
    }

    res.status(200).json(geojson);
  } catch (error) {
    console.error('❌ Erreur API critique:', error);
    
    // Même en cas d'erreur critique, retourner une structure GeoJSON vide
    // plutôt qu'une erreur 500
    const emptyGeojson = {
      type: 'FeatureCollection',
      features: []
    };
    
    console.warn('⚠️ Retour d\'une collection vide en raison de l\'erreur');
    res.status(200).json(emptyGeojson);
  }
} 