import { useEffect, useMemo, useRef, useState } from 'react';
import { useRunClubs } from '../hooks/useRunClubs';
import type { RunClubFeature } from '../RunClubMap';
import { haversineDistanceKm, formatDistanceKm, type UserLocation } from '../utils/geo';

const LIKED_STORAGE_KEY = 'rcm-liked-clubs';
const SWIPE_THRESHOLD = 110;

function clubKey(club: RunClubFeature): string {
  return `${club.properties.name}__${club.properties.city ?? ''}`;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? '';
  if (words.length <= 1) return first.slice(0, 2).toUpperCase() || '?';
  const second = words[1] ?? '';
  return (first.charAt(0) + second.charAt(0)).toUpperCase();
}

// Corrige les URLs d'images mal formées dans les données (même logique que
// RunClubMap) : certaines entrées pointent vers la racine du site au lieu
// du dossier /images/, ce qui casse l'affichage si on ne réécrit pas l'URL.
function getImageSrc(image?: string): string | null {
  if (!image) return null;
  if (
    image.includes('run-club-maps.vercel.app/') &&
    (image.includes('.png') || image.includes('.jpg') || image.includes('.jpeg')) &&
    !image.includes('/images/')
  ) {
    const fileName = image.split('/').pop();
    return `/images/${fileName}`;
  }
  if (!image.startsWith('http') && !image.startsWith('/images/')) {
    return `/images/${image}`;
  }
  return image;
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
  }
  return arr;
}

function loadLikedKeys(): string[] {
  try {
    const raw = localStorage.getItem(LIKED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// Distance jusqu'à un club depuis la position de l'utilisateur (null si inconnue)
function clubDistanceKm(club: RunClubFeature, userLocation: UserLocation | null): number | null {
  if (!userLocation) return null;
  const [lng, lat] = club.geometry.coordinates;
  if (isNaN(lat) || isNaN(lng)) return null;
  return haversineDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
}

type ExitDirection = 'like' | 'pass' | null;

interface ClubSwiperProps {
  onBack: () => void;
  /** Position de l'utilisateur (demandée automatiquement à l'arrivée sur le site) —
   * quand elle est connue, la pile de clubs est triée du plus proche au plus loin
   * au lieu d'être mélangée au hasard. */
  userLocation: UserLocation | null;
}

export default function ClubSwiper({ onBack, userLocation }: ClubSwiperProps) {
  const { clubs, loading } = useRunClubs();
  const [deckVersion, setDeckVersion] = useState(0);
  const [index, setIndex] = useState(0);
  const [likedKeys, setLikedKeys] = useState<string[]>(() => loadLikedKeys());

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<ExitDirection>(null);
  const [burst, setBurst] = useState<ExitDirection>(null);
  const [imageError, setImageError] = useState(false);
  const burstTimeoutRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const hasCenteredDeckOnLocationRef = useRef(false);

  // Si la position de l'utilisateur est connue, la pile est triée du plus proche
  // au plus loin ; sinon elle reste mélangée au hasard comme avant.
  // deckVersion n'est lu que dans ce second cas : c'est un simple "cache-buster"
  // pour forcer un nouveau mélange quand on clique sur "Rejouer".
  const deck = useMemo(() => {
    if (userLocation) {
      return [...clubs].sort(
        (a, b) => (clubDistanceKm(a, userLocation) ?? Infinity) - (clubDistanceKm(b, userLocation) ?? Infinity)
      );
    }
    return shuffle(clubs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubs, deckVersion, userLocation]);

  // La première fois que la position devient disponible, on revient au début de
  // la pile (désormais triée par distance) pour ne pas laisser l'utilisateur au
  // milieu d'un ordre qui vient de changer sous ses pieds.
  useEffect(() => {
    if (userLocation && !hasCenteredDeckOnLocationRef.current) {
      hasCenteredDeckOnLocationRef.current = true;
      setIndex(0);
    }
  }, [userLocation]);

  const current = deck[index];
  const next = deck[index + 1];
  const currentDistanceKm = current ? clubDistanceKm(current, userLocation) : null;
  const isDone = !loading && deck.length > 0 && index >= deck.length;
  const likedClubs = useMemo(
    () => clubs.filter((c) => likedKeys.includes(clubKey(c))),
    [clubs, likedKeys]
  );

  useEffect(() => {
    try {
      localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(likedKeys));
    } catch {
      // localStorage indisponible (navigation privée...) : on ignore silencieusement
    }
  }, [likedKeys]);

  // Réinitialise l'état d'erreur d'image à chaque nouvelle carte affichée
  useEffect(() => {
    setImageError(false);
  }, [current]);

  useEffect(() => {
    return () => {
      if (burstTimeoutRef.current) window.clearTimeout(burstTimeoutRef.current);
    };
  }, []);

  const commitSwipe = (direction: 'like' | 'pass') => {
    if (!current || exitDirection) return;
    setExitDirection(direction);

    // Gros cœur / grosse croix au centre, en confirmation de l'action.
    setBurst(direction);
    if (burstTimeoutRef.current) window.clearTimeout(burstTimeoutRef.current);
    burstTimeoutRef.current = window.setTimeout(() => setBurst(null), 650);

    window.setTimeout(() => {
      if (direction === 'like') {
        const key = clubKey(current);
        setLikedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
      }
      setIndex((i) => i + 1);
      setDragX(0);
      setExitDirection(null);
    }, 220);
  };

  const removeLikedClub = (key: string) => {
    setLikedKeys((prev) => prev.filter((k) => k !== key));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (exitDirection) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || pointerIdRef.current !== e.pointerId) return;
    setDragX(e.clientX - startXRef.current);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      commitSwipe(dragX > 0 ? 'like' : 'pass');
    } else {
      setDragX(0);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!current || exitDirection) return;
      if (e.key === 'ArrowRight') commitSwipe('like');
      if (e.key === 'ArrowLeft') commitSwipe('pass');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, exitDirection]);

  const restart = () => {
    setIndex(0);
    setDeckVersion((v) => v + 1);
  };

  const translateX = exitDirection ? (exitDirection === 'like' ? 700 : -700) : dragX;
  const rotate = translateX / 18;
  const likeOpacity = Math.min(Math.max(dragX, 0) / 80, 1);
  const passOpacity = Math.min(Math.max(-dragX, 0) / 80, 1);

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-paper-soft px-4 py-6 sm:px-6 sm:py-10 lg:px-16">
      <button
        type="button"
        onClick={onBack}
        className="mx-auto flex max-w-md items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-accent"
      >
        ← Retour au site
      </button>

      <div className="mx-auto mt-4 max-w-md text-center sm:mt-6">
        <span className="inline-block rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
          🔥 Découverte
        </span>
        <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-tight text-ink sm:mt-4 sm:text-4xl">
          Trouve ton <span className="text-accent">club</span> 🔥
        </h2>
        {!loading && !isDone && current && (
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-concrete">
            👉 Glisse <span className="font-bold text-accent">à droite</span> pour aimer,{' '}
            <span className="font-bold text-red-400">à gauche</span> pour passer.
          </p>
        )}
        {!loading && deck.length > 0 && !isDone && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-concrete/70">
            Club {Math.min(index + 1, deck.length)} / {deck.length}
          </p>
        )}
      </div>

      <div className="relative mx-auto mt-6 h-[min(64vh,520px)] max-w-sm select-none sm:mt-8 sm:h-[560px]">
        {loading && (
          <div className="flex h-full items-center justify-center rounded-lg border border-ink-line bg-paper text-sm text-concrete shadow-sm">
            Chargement des clubs…
          </div>
        )}

        {!loading && deck.length === 0 && (
          <div className="flex h-full items-center justify-center rounded-lg border border-ink-line bg-paper px-6 text-center text-sm text-concrete shadow-sm">
            Impossible de charger les clubs pour le moment.
          </div>
        )}

        {!loading && !isDone && current && (
          <>
            {/* Carte suivante, en aperçu derrière la carte active */}
            {next && (
              <div className="absolute inset-0 scale-[0.94] rounded-lg border border-ink-line bg-paper opacity-70" />
            )}

            {/* Carte active, draggable */}
            <div
              className="absolute inset-0 flex touch-none flex-col overflow-hidden rounded-lg border border-ink-line bg-paper shadow-[0_20px_45px_rgba(18,21,26,0.14)]"
              style={{
                transform: `translateX(${translateX}px) rotate(${rotate}deg)`,
                transition: dragging ? 'none' : 'transform 260ms ease, opacity 260ms ease',
                opacity: exitDirection ? 0 : 1,
                cursor: dragging ? 'grabbing' : 'grab',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <div className="relative h-32 w-full shrink-0 bg-paper-soft sm:h-48">
                {getImageSrc(current.properties.image) && !imageError ? (
                  <img
                    src={getImageSrc(current.properties.image)!}
                    alt={current.properties.name}
                    draggable={false}
                    className="h-full w-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-soft to-paper-soft text-4xl font-display font-bold text-accent sm:text-5xl">
                    {getInitials(current.properties.name)}
                  </div>
                )}

                {/* Repères fixes qui rappellent, dès l'arrivée sur la carte (sans avoir
                    besoin de commencer à glisser), quel côté correspond à quelle action. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80">
                  <span>✕ Passer</span>
                  <span>Aimer ❤️</span>
                </div>

                {/* Timbres LIKE (cœur) / PASS (croix), qui apparaissent en glissant */}
                <div
                  className="absolute left-4 top-4 flex h-16 w-16 rotate-[-16deg] items-center justify-center rounded-full border-4 border-accent bg-white/90 text-3xl shadow-[0_4px_16px_rgba(18,21,26,0.25)]"
                  style={{ opacity: likeOpacity }}
                >
                  ❤️
                </div>
                <div
                  className="absolute right-4 top-4 flex h-16 w-16 rotate-[16deg] items-center justify-center rounded-full border-4 border-red-400 bg-white/90 text-3xl text-red-400 shadow-[0_4px_16px_rgba(18,21,26,0.25)]"
                  style={{ opacity: passOpacity }}
                >
                  ✕
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-4 sm:gap-2 sm:p-5">
                <h3 className="m-0 font-display text-xl font-bold uppercase tracking-tight text-ink sm:text-2xl">
                  {current.properties.name}
                </h3>
                {(current.properties.city || currentDistanceKm !== null) && (
                  <p className="m-0 flex items-center gap-2 text-sm text-concrete">
                    {current.properties.city && <span>📍 {current.properties.city}</span>}
                    {currentDistanceKm !== null && (
                      <span className="font-stat text-base tracking-wide text-accent">
                        {formatDistanceKm(currentDistanceKm)}
                      </span>
                    )}
                  </p>
                )}
                {current.properties.frequency && (
                  <div className="mt-1 inline-block w-fit rounded-sm bg-ink px-2.5 py-1.5 text-xs font-medium text-paper">
                    ⏰ {current.properties.frequency}
                  </div>
                )}
                {current.properties.description && (
                  <p className="m-0 line-clamp-3 text-sm leading-snug text-concrete sm:line-clamp-4">
                    {current.properties.description}
                  </p>
                )}

                {current.properties.social && Object.values(current.properties.social).some(Boolean) && (
                  <div
                    className="mt-auto flex flex-wrap gap-1.5 pt-2"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {current.properties.social.website && (
                      <a href={current.properties.social.website} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-accent px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-accent no-underline">
                        🔗 Site
                      </a>
                    )}
                    {current.properties.social.instagram && (
                      <a href={current.properties.social.instagram} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-ink-line px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink no-underline">
                        📷 Instagram
                      </a>
                    )}
                    {current.properties.social.strava && (
                      <a href={current.properties.social.strava} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-ink-line px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink no-underline">
                        🏃 Strava
                      </a>
                    )}
                    {current.properties.social.facebook && (
                      <a href={current.properties.social.facebook} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-ink-line px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink no-underline">
                        📘 Facebook
                      </a>
                    )}
                    {current.properties.social.whatsapp && (
                      <a href={current.properties.social.whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-ink-line px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink no-underline">
                        💬 WhatsApp
                      </a>
                    )}
                    {current.properties.social.tiktok && (
                      <a href={current.properties.social.tiktok} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-ink-line px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink no-underline">
                        🎵 TikTok
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Gros cœur / grosse croix qui pulse au centre pour confirmer l'action */}
        {burst && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div
              className={`flex h-36 w-36 items-center justify-center rounded-full border-8 bg-white/95 text-7xl shadow-[0_10px_40px_rgba(18,21,26,0.3)] ${
                burst === 'like' ? 'border-accent' : 'border-red-400 text-red-400'
              }`}
              style={{ animation: 'club-swipe-burst 650ms ease-out forwards' }}
            >
              {burst === 'like' ? '❤️' : '✕'}
            </div>
          </div>
        )}

        {!loading && isDone && (
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-ink-line bg-paper px-6 text-center shadow-sm">
            <span className="text-4xl">🏁</span>
            <p className="m-0 font-display text-xl font-bold uppercase tracking-tight text-ink">
              {likedClubs.length > 0
                ? `Tu as aimé ${likedClubs.length} club${likedClubs.length > 1 ? 's' : ''} !`
                : "Aucun coup de cœur cette fois"}
            </p>
            <button
              type="button"
              onClick={restart}
              className="rounded-sm bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-ink transition-transform hover:-translate-y-0.5"
            >
              🔄 Rejouer
            </button>
          </div>
        )}
      </div>

      {/* Boutons d'action, alternative accessible au glisser-déposer.
          Chaque bouton porte une légende visible : les emojis seuls sont
          ambigus pour qui arrive sans avoir lu les instructions au-dessus. */}
      {!loading && !isDone && current && (
        <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-8 sm:mt-6">
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              aria-label="Passer ce club"
              onClick={() => commitSwipe('pass')}
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink-line bg-paper text-2xl text-ink shadow-sm transition-transform hover:-translate-y-0.5 hover:border-ink"
            >
              ✕
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-concrete">Passer</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              aria-label="Aimer ce club"
              onClick={() => commitSwipe('like')}
              className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-accent text-2xl text-ink transition-transform hover:-translate-y-0.5"
            >
              ❤️
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-accent">J'aime</span>
          </div>
        </div>
      )}

      {/* Récapitulatif des clubs likés : grille compacte et contenue, avec
          suppression individuelle, pour ne pas laisser la liste grandir
          indéfiniment dans la page. */}
      {likedClubs.length > 0 && (
        <div className="mx-auto mt-8 max-w-lg sm:mt-12">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">
              Tes clubs likés ({likedClubs.length})
            </h3>
            <button
              type="button"
              onClick={() => setLikedKeys([])}
              className="text-[11px] font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-accent"
            >
              Tout effacer
            </button>
          </div>

          <div className="mt-3 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto rounded-sm border border-ink-line bg-paper-soft p-2 [scrollbar-color:#FF5500_#e6e7e1] [scrollbar-width:thin] sm:grid-cols-3">
            {likedClubs.map((club) => {
              const key = clubKey(club);
              const distanceKm = clubDistanceKm(club, userLocation);
              return (
                <div
                  key={key}
                  className="relative flex flex-col gap-1 rounded-sm border border-ink-line bg-paper p-2.5 pr-6 shadow-sm"
                >
                  <button
                    type="button"
                    aria-label={`Retirer ${club.properties.name} des favoris`}
                    onClick={() => removeLikedClub(key)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-concrete transition-colors hover:bg-red-400 hover:text-white"
                  >
                    ✕
                  </button>
                  <p className="m-0 truncate text-xs font-bold text-ink">{club.properties.name}</p>
                  {(club.properties.city || distanceKm !== null) && (
                    <p className="m-0 flex items-center gap-1.5 truncate text-[11px] text-concrete">
                      {club.properties.city && <span className="truncate">{club.properties.city}</span>}
                      {distanceKm !== null && (
                        <span className="shrink-0 font-bold uppercase tracking-wide text-accent">
                          {formatDistanceKm(distanceKm)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes club-swipe-burst {
          0% { transform: scale(0.4); opacity: 0; }
          35% { transform: scale(1.15); opacity: 1; }
          60% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.05); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
