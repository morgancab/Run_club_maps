-- Schéma de la table "clubs", à exécuter une fois dans l'éditeur SQL de
-- Supabase (Project > SQL Editor > New query) avant de lancer la migration
-- depuis le Google Sheet (npm run migrate:supabase).
--
-- Les colonnes reprennent exactement les en-têtes du Google Sheet actuel :
-- name, city, frequency, frequency_en, description, description_en, image,
-- latitude, longitude, instagram, facebook, website, tiktok, whatsapp, strava.
--
-- IMPORTANT : garder tous les noms de colonnes en minuscules, sans camelCase.
-- Postgres met automatiquement en minuscules tout identifiant non entre
-- guillemets ("whatsApp" devient réellement whatsapp en base) : si le code
-- (lib/fetchClubs.ts, scripts/migrate-sheet-to-supabase.ts...) référence une
-- colonne en camelCase alors qu'elle a été créée sans guillemets, Supabase
-- renverra "Could not find the 'xxx' column" au moindre insert/update.

create table if not exists public.clubs (
  id bigint generated always as identity primary key,
  name text not null,
  city text,
  frequency text,
  frequency_en text,
  description text,
  description_en text,
  image text,
  latitude double precision,
  longitude double precision,
  instagram text,
  facebook text,
  website text,
  tiktok text,
  whatsapp text,
  strava text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Sert de clé naturelle pour la migration (upsert) : permet de relancer le
  -- script d'import depuis le Google Sheet sans créer de doublons.
  unique (name, city)
);

-- Le site affiche les clubs publiquement, sans authentification : la lecture
-- doit donc être ouverte à tous via la clé publique "anon". Les écritures
-- (migration, ajout/édition de clubs) passent par la clé "service_role", qui
-- contourne la RLS et ne doit jamais être exposée côté navigateur.
alter table public.clubs enable row level security;

drop policy if exists "Public read access" on public.clubs;
create policy "Public read access"
  on public.clubs
  for select
  to anon, authenticated
  using (true);

-- Certains projets Supabase n'accordent pas automatiquement les privilèges
-- par défaut aux nouvelles tables. RLS et GRANT sont deux couches séparées :
-- même le rôle "service_role" (qui contourne la RLS) a besoin de ce GRANT
-- explicite, sans quoi on obtient "permission denied for table clubs" au
-- moindre insert/update/upsert.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.clubs to anon, authenticated;
grant select, insert, update, delete on public.clubs to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Tient "updated_at" à jour automatiquement à chaque modification d'une ligne.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_clubs_updated_at on public.clubs;
create trigger set_clubs_updated_at
  before update on public.clubs
  for each row
  execute function public.set_updated_at();

-- Accélère les filtres par ville déjà présents côté site.
create index if not exists clubs_city_idx on public.clubs (city);
