import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fetchRunClubs } from '../lib/fetchClubs.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Route API pour les clubs de running
app.get('/api/runclubs', async (req, res) => {
  try {
    console.log('📡 Récupération des données depuis Supabase...');
    const clubs = await fetchRunClubs();
    
    const geojson = {
      type: 'FeatureCollection',
      features: clubs
    };

    console.log(`✅ ${clubs.length} clubs récupérés avec succès`);
    res.json(geojson);
  } catch (error) {
    console.error('❌ Erreur API:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des données',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur de développement démarré sur http://localhost:${PORT}`);
  console.log(`📡 API disponible sur http://localhost:${PORT}/api/runclubs`);
}); 