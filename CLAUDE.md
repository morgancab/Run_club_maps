# Run Club Maps

App React/TypeScript (Vite) affichant des clubs de running sur une carte Leaflet, données stockées dans Supabase (Postgres), déployée sur Vercel.

## Stack
- React 19 + TypeScript, Vite 6, Tailwind CSS 4
- Leaflet / react-leaflet / leaflet.markercluster pour la carte
- Backend: API Vercel serverless (`api/runclubs/index.ts`) + `lib/fetchClubs.ts` (lecture table Supabase `clubs` via `@supabase/supabase-js`)
- `api/submit-club/index.ts` — formulaire public "Proposer un club" ([SuggestClubModal.tsx](src/components/SuggestClubModal.tsx)) : upload du logo vers Supabase Storage + insertion en base avec `status = 'pending'`. N'apparaît sur la carte publique qu'après passage manuel à `status = 'approved'` dans la table Supabase.
- `api/geocode/index.ts` — proxy vers Nominatim (OpenStreetMap) pour la suggestion d'adresse du formulaire ; sans clé API, mais nécessite un en-tête `User-Agent` que seul un appel serveur peut fixer (d'où le proxy plutôt qu'un appel direct depuis le navigateur).
- Dev local: `scripts/dev-server.ts` (Express) simule les trois routes serverless ci-dessus
- Ancienne source de données (Google Sheet) conservée uniquement pour la migration ponctuelle : `lib/fetchSheet.ts` + `scripts/migrate-sheet-to-supabase.ts`

## Commandes
- `npm run dev` — lance API (Express, port 3001) + Vite en parallèle
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — ESLint
- `npm run migrate:supabase` — importe/ré-importe les clubs du Google Sheet vers Supabase (upsert sur name+city)
- `npm run migrate:images` — re-héberge les images de clubs (liens externes fragiles) dans Supabase Storage
- `npm run migrate:instagram-avatars` — tentative (peu fiable, Instagram bloque en général) de récupérer une photo de profil Instagram pour les clubs à l'image cassée
- `npm run test:api` / `test:api:detailed` / `test:fetchsheet` / `test:vercel` — scripts de test manuels dans `scripts/`

Pas de suite de tests unitaires (Jest/Vitest) — les "test:*" sont des scripts Node ad-hoc.

Note : `tsc -b` (dans `npm run build`) ne type-check que `src/` et `vite.config.ts` (voir `tsconfig.app.json` / `tsconfig.node.json`) — `lib/`, `api/` et `scripts/` ne sont vérifiés que par `npm run lint`, pas par le build.

## Structure clé
- `src/RunClubMap.tsx` — composant principal de la carte (le plus volumineux, lire en ciblé avec grep/offset plutôt qu'en entier si possible)
- `src/services/cacheService.ts` + `src/hooks/useCache.ts` — cache côté client des données clubs (voir CACHE-GUIDE.md)
- `src/hooks/useSEO.ts` — gestion SEO dynamique (voir SEO-GUIDE.md)
- `lib/fetchClubs.ts` — lecture de la table Supabase `clubs`, utilisée par `api/` et `scripts/dev-server.ts`
- `lib/fetchSheet.ts` — ancienne lecture Google Sheets, gardée uniquement pour `scripts/migrate-sheet-to-supabase.ts`
- `supabase/schema.sql` — schéma de la table `clubs` à exécuter dans l'éditeur SQL Supabase avant toute migration
- `api/runclubs/index.ts` — endpoint serverless Vercel
- `public/manifest.json` — PWA manifest

## Déploiement
Vercel. De nombreux fichiers `VERCEL-*.md` / `SOLUTION-*.md` à la racine documentent des problèmes déjà résolus (ES modules, runtime, export). **Ne pas les relire par défaut** — seulement si un problème de déploiement Vercel similaire réapparaît. Référence courante: `DEPLOYMENT.md`, `DEPLOYMENT-FINAL.md`, `vercel.json`.

## Conventions pour Claude (économie de tokens)
- Ne pas lire les fichiers `VERCEL-*.md`, `SOLUTION-*.md` sauf besoin explicite lié à un bug de build/déploiement — ce sont des post-mortems historiques, pas une doc à jour.
- Préférer `Grep`/`Glob` ciblés à la lecture complète de `src/RunClubMap.tsx` ou `lib/fetchSheet.ts`.
- Le dossier `dist/` est généré par le build — ne jamais l'éditer ni le lire pour comprendre le code source.
- Variables d'env: voir `env.example` (Supabase + Google Sheets pour la migration) — ne jamais logger ni commit une vraie clé (`keys/`, `.env`, `.env.local` sont gitignorés). `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être exposée côté client (elle ne doit apparaître que dans du code qui tourne sur le serveur : `api/*`, `scripts/*`), mais elle DOIT être présente dans les env vars Vercel du site déployé depuis l'ajout de `api/submit-club` — ne pas réappliquer l'ancienne consigne « jamais sur Vercel ».
- Commits en anglais court style `type: description` (ex. `fix: clean Vercel configuration`), cohérent avec l'historique existant.
