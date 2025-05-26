import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchRunClubs } from '../../lib/fetchSheet';

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

    res.status(200).json(geojson);
  } catch (error) {
    console.error('Erreur API:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des données',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
} 