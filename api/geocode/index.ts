import type { VercelRequest, VercelResponse } from '@vercel/node';

// Proxy vers l'API de recherche d'adresse d'OpenStreetMap (Nominatim),
// gratuite et sans clé. Nominatim exige un User-Agent identifiant
// l'application pour tout usage automatisé — un navigateur ne peut pas fixer
// cet en-tête lui-même (header interdit côté fetch du navigateur), d'où ce
// petit relai côté serveur plutôt qu'un appel direct depuis le formulaire.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'run-club-maps/1.0 (formulaire de suggestion de club)';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  const query = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
  if (query.length < 3) {
    res.status(200).json({ suggestions: [] });
    return;
  }

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', '5');
    url.searchParams.set('accept-language', 'fr');
    url.searchParams.set('q', query);

    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });

    if (!response.ok) {
      throw new Error(`Nominatim a répondu ${response.status}`);
    }

    const results = (await response.json()) as NominatimResult[];

    const suggestions = results.map((result) => ({
      displayName: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city:
        result.address?.city ||
        result.address?.town ||
        result.address?.village ||
        result.address?.municipality ||
        result.address?.county ||
        '',
    }));

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('❌ Erreur géocodage:', error);
    res.status(200).json({ suggestions: [] });
  }
}
