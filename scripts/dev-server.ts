import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fetchRunClubs } from '../lib/fetchClubs.js';
import geocodeHandler from '../api/geocode/index.js';
import submitClubHandler from '../api/submit-club/index.js';
import adminClubsHandler from '../api/admin/clubs/index.js';
import adminEditRequestsHandler from '../api/admin/edit-requests/index.js';
import ownerClubsHandler from '../api/owner/clubs/index.js';
import ownerEditRequestsHandler from '../api/owner/edit-requests/index.js';
import adminUsersHandler from '../api/admin/users/index.js';

const app = express();
const PORT = 3001;

app.use(cors());
// Limite relevée par rapport au défaut Express (100kb) : le logo envoyé en
// base64 par le formulaire de suggestion peut peser plusieurs Mo.
app.use(express.json({ limit: '10mb' }));

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

// Les handlers Vercel (VercelRequest/VercelResponse) sont compatibles avec
// les req/res Express au runtime : on les réutilise tels quels en local
// plutôt que de dupliquer la logique de géocodage et de soumission.
app.get('/api/geocode', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geocodeHandler(req as any, res as any);
});
app.post('/api/submit-club', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submitClubHandler(req as any, res as any);
});
app.all('/api/admin/clubs', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClubsHandler(req as any, res as any);
});
app.all('/api/admin/edit-requests', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminEditRequestsHandler(req as any, res as any);
});
app.all('/api/owner/clubs', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ownerClubsHandler(req as any, res as any);
});
app.all('/api/owner/edit-requests', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ownerEditRequestsHandler(req as any, res as any);
});
app.all('/api/admin/users', (req, res) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminUsersHandler(req as any, res as any);
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur de développement démarré sur http://localhost:${PORT}`);
  console.log(`📡 API disponible sur http://localhost:${PORT}/api/runclubs`);
}); 