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

-- Statut de modération : les clubs déjà en base (import du Sheet) sont
-- réputés validés. Les nouvelles lignes créées via le formulaire public
-- ("Proposer un club", api/submit-club) partent en "pending" et ne sont
-- visibles sur la carte qu'une fois repassées à "approved" dans la table
-- Supabase — un simple changement de valeur dans l'éditeur de table suffit,
-- pas besoin d'interface d'administration dédiée.
alter table public.clubs add column if not exists status text not null default 'approved';
alter table public.clubs alter column status set default 'pending';

do $$ begin
  alter table public.clubs
    add constraint clubs_status_check check (status in ('pending', 'approved', 'rejected'));
exception when duplicate_object then null;
end $$;

create index if not exists clubs_status_idx on public.clubs (status);

-- Le site affiche les clubs publiquement, sans authentification : la lecture
-- doit donc être ouverte à tous via la clé publique "anon", mais uniquement
-- pour les clubs validés. Les écritures (migration, formulaire public de
-- suggestion) passent par la clé "service_role", qui contourne la RLS et ne
-- doit jamais être exposée côté navigateur.
alter table public.clubs enable row level security;

drop policy if exists "Public read access" on public.clubs;
create policy "Public read access"
  on public.clubs
  for select
  to anon, authenticated
  using (status = 'approved');

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

-- ============================================================
-- ESPACE OWNER (/mon-club) — gestion des infos par le club lui-même
-- ============================================================
--
-- Un owner est un compte Supabase Auth (email/mot de passe, inscription
-- libre) associé à un club via owner_email. L'association est faite
-- MANUELLEMENT par l'admin (dans /admin, en renseignant l'email du owner sur
-- sa fiche club) : un owner ne peut jamais s'auto-attribuer un club en
-- devinant son nom, il doit avoir été explicitement désigné au préalable.
alter table public.clubs add column if not exists owner_email text;
create index if not exists clubs_owner_email_idx on public.clubs (owner_email);

-- Les modifications soumises par un owner ne s'appliquent jamais
-- directement sur "clubs" (qui reste la source affichée publiquement) :
-- elles sont stockées ici en attente de validation par l'admin, qui peut les
-- approuver (appliquées à clubs) ou les rejeter (ignorées).
create table if not exists public.club_edit_requests (
  id bigint generated always as identity primary key,
  club_id bigint not null references public.clubs(id) on delete cascade,
  owner_email text not null,
  changes jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists club_edit_requests_status_idx on public.club_edit_requests (status);
create index if not exists club_edit_requests_club_id_idx on public.club_edit_requests (club_id);

-- Table réservée au serveur : ni owner ni public n'y accèdent directement
-- depuis le navigateur (tout passe par /api/owner/* et /api/admin/*, qui
-- utilisent la clé service_role). RLS activée sans policy = aucun accès
-- anon/authenticated, seul service_role (qui contourne la RLS) peut lire/écrire.
alter table public.club_edit_requests enable row level security;

grant select, insert, update on public.club_edit_requests to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ============================================================
-- SUIVI DES COMPTES OWNER (KPI admin) — app_users
-- ============================================================
--
-- auth.users (géré par Supabase Auth) n'est pas directement exploitable pour
-- des jointures/KPI côté app : pas dans le schéma "public", et il ne compte
-- pas le nombre de connexions (seulement la dernière). Cette table miroir,
-- alimentée automatiquement par triggers, sert uniquement à /admin (onglet
-- "Owners") pour suivre qui s'est inscrit, à quelle fréquence il se connecte,
-- et (calculé côté API à partir de clubs.owner_email /
-- club_edit_requests.owner_email) à quel(s) club(s) il est associé et
-- combien de modifications il a proposées.
create table if not exists public.app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  login_count integer not null default 0
);

alter table public.app_users enable row level security;
grant select on public.app_users to service_role;

-- Crée la ligne app_users dès l'inscription (mode "Créer un compte" sur
-- /mon-club).
create or replace function public.handle_auth_user_created()
returns trigger as $$
begin
  insert into public.app_users (id, email, created_at)
  values (new.id, new.email, new.created_at)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_created();

-- Supabase Auth met à jour auth.users.last_sign_in_at à chaque connexion
-- réussie : on s'y accroche pour incrémenter notre propre compteur, que
-- Supabase ne fournit pas nativement.
create or replace function public.handle_auth_user_login()
returns trigger as $$
begin
  if new.last_sign_in_at is distinct from old.last_sign_in_at then
    update public.app_users
    set last_login_at = new.last_sign_in_at,
        login_count = login_count + 1
    where id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_login on auth.users;
create trigger on_auth_user_login
  after update on auth.users
  for each row execute function public.handle_auth_user_login();
