import { useEffect, useMemo, useRef, useState } from 'react';
import { useRunClubs } from '../hooks/useRunClubs';
import type { RunClubFeature, Language } from '../RunClubMap';
import { haversineDistanceKm, formatDistanceKm, type UserLocation } from '../utils/geo';
import SocialIcon from './SocialIcon';
import { translations } from '../i18n';

const LIKED_STORAGE_KEY = 'rcm-liked-clubs';
const SWIPE_THRESHOLD = 90;
// Un geste rapide ("flick") déclenche le swipe même sur une plus courte distance,
// pour que l'appli réagisse comme on l'attend d'un vrai geste de swipe.
const FLICK_VELOCITY = 0.5; // px/ms
const FLICK_MIN_DISTANCE = 40;

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
  language: Language;
  onBack: () => void;
  /** Position de l'utilisateur (demandée automatiquement à l'arrivée sur le site) —
   * quand elle est connue, la pile de clubs est triée du plus proche au plus loin
   * au lieu d'être mélangée au hasard. */
  userLocation: UserLocation | null;
}

export default function ClubSwiper({ language, onBack, userLocation }: ClubSwiperProps) {
  const t = translations[language];
  const { clubs, loading } = useRunClubs();
  const [deckVersion, setDeckVersion] = useState(0);
  const [index, setIndex] = useState(0);
  const [likedKeys, setLikedKeys] = useState<string[]>(() => loadLikedKeys());

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<ExitDirection>(null);
  const [burst, setBurst] = useState<ExitDirection>(null);
  const [imageError, setImageError] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const burstTimeoutRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const hasCenteredDeckOnLocationRef = useRef(false);
  // Vitesse du geste, pour reconnaître un "flick" rapide même sur une courte distance.
  const lastMoveRef = useRef({ x: 0, t: 0 });
  const velocityRef = useRef(0);
  // Dernière carte swipée : permet de revenir en arrière avec "Annuler".
  const lastSwipeRef = useRef<{ index: number; direction: 'like' | 'pass'; club: RunClubFeature } | null>(null);

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

    // Mémorise le geste pour permettre de l'annuler.
    lastSwipeRef.current = { index, direction, club: current };
    setCanUndo(true);

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

  // Revient sur le club précédent et annule le like éventuel — un filet de
  // sécurité pour les gestes déclenchés par erreur.
  const undoLastSwipe = () => {
    const last = lastSwipeRef.current;
    if (!last) return;
    if (last.direction === 'like') {
      const key = clubKey(last.club);
      setLikedKeys((prev) => prev.filter((k) => k !== key));
    }
    setIndex(last.index);
    setExitDirection(null);
    setBurst(null);
    setDragX(0);
    lastSwipeRef.current = null;
    setCanUndo(false);
  };

  const removeLikedClub = (key: string) => {
    setLikedKeys((prev) => prev.filter((k) => k !== key));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (exitDirection) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    lastMoveRef.current = { x: e.clientX, t: performance.now() };
    velocityRef.current = 0;
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || pointerIdRef.current !== e.pointerId) return;
    const now = performance.now();
    const dt = now - lastMoveRef.current.t;
    if (dt > 0) velocityRef.current = (e.clientX - lastMoveRef.current.x) / dt;
    lastMoveRef.current = { x: e.clientX, t: now };
    setDragX(e.clientX - startXRef.current);
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    const isFlick = Math.abs(velocityRef.current) > FLICK_VELOCITY && Math.abs(dragX) > FLICK_MIN_DISTANCE;
    if (Math.abs(dragX) > SWIPE_THRESHOLD || isFlick) {
      commitSwipe(dragX > 0 ? 'like' : 'pass');
    } else {
      setDragX(0);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && canUndo) {
        e.preventDefault();
        undoLastSwipe();
        return;
      }
      if (!current || exitDirection) return;
      if (e.key === 'ArrowRight') commitSwipe('like');
      if (e.key === 'ArrowLeft') commitSwipe('pass');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, exitDirection, canUndo]);

  const restart = () => {
    setIndex(0);
    setDeckVersion((v) => v + 1);
    lastSwipeRef.current = null;
    setCanUndo(false);
  };

  const afterNext = deck[index + 2];
  const translateX = exitDirection ? (exitDirection === 'like' ? 700 : -700) : dragX;
  const translateY = exitDirection ? 0 : Math.abs(dragX) * -0.06;
  const rotate = translateX / 18;
  const likeOpacity = Math.min(Math.max(dragX, 0) / 80, 1);
  const passOpacity = Math.min(Math.max(-dragX, 0) / 80, 1);
  const progressPct = deck.length > 0 ? (Math.min(index, deck.length) / deck.length) * 100 : 0;

  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-paper-soft px-4 py-3 sm:px-6 sm:py-6 lg:flex lg:h-[calc(100vh-4rem)] lg:flex-col lg:px-16 lg:py-4">
      {/* Accents décoratifs discrets, cohérents avec le reste du site (Hero) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-[-8%] h-[300px] w-[300px] rounded-full bg-accent/10 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 right-[-8%] h-[300px] w-[300px] rounded-full bg-accent/10 blur-[100px]"
      />

      <button
        type="button"
        onClick={onBack}
        className="relative mx-auto flex w-full max-w-4xl shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-accent"
      >
        {t.swipeBack}
      </button>

      {/* Deux colonnes à partir de lg : la découverte (cartes) reste compacte
          et légèrement décalée à gauche, les clubs likés apparaissent à droite
          au fur et à mesure au lieu de s'empiler en dessous. En dessous de lg,
          faute de place, tout reste centré et empilé verticalement.
          lg:flex-1 + lg:min-h-0 : la ligne (et tout ce qu'elle contient) se
          redimensionne pour tenir exactement dans la hauteur restante de
          l'écran, quelle que soit sa taille — jamais de barre de défilement
          de page sur desktop. */}
      <div className="relative mx-auto mt-4 flex max-w-4xl flex-col items-center gap-8 lg:mt-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch lg:justify-center lg:gap-10">
        {/* Colonne découverte */}
        <div className="flex w-full max-w-xs flex-col sm:max-w-sm lg:min-h-0">
          <div className="shrink-0 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              {t.swipeBadge}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold uppercase leading-none tracking-tight text-ink sm:text-3xl">
              {t.swipeHeadingPrefix} <span className="text-accent">club</span> 🔥
            </h2>
            {!loading && !isDone && current && (
              <p className="mx-auto mt-2 text-xs leading-snug text-concrete sm:text-sm">
                ❤️ <span className="font-bold text-accent">{t.swipeHintRight}</span> {t.swipeHintLike}, ✕{' '}
                <span className="font-bold text-red-400">{t.swipeHintLeft}</span> {t.swipeHintPass}.
              </p>
            )}
            {!loading && deck.length > 0 && !isDone && (
              <div className="mx-auto mt-3 max-w-[220px]">
                <div className="h-1 overflow-hidden rounded-full bg-ink-line">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-concrete/70">
                  {t.swipeCounterPrefix} {Math.min(index + 1, deck.length)} / {deck.length}
                </p>
              </div>
            )}
          </div>

          {/* Pile de cartes : hauteur fixe (adaptée au viewport) sur mobile,
              flexible sur desktop pour toujours tenir dans l'écran. */}
          <div className="relative mx-auto mt-4 h-[min(54vh,440px)] w-full sm:h-[480px] lg:h-auto lg:min-h-0 lg:flex-1">
            {loading && (
              <div className="flex h-full items-center justify-center rounded-2xl border border-ink-line bg-paper text-sm text-concrete shadow-sm">
                {t.swipeLoading}
              </div>
            )}

            {!loading && deck.length === 0 && (
              <div className="flex h-full items-center justify-center rounded-2xl border border-ink-line bg-paper px-6 text-center text-sm text-concrete shadow-sm">
                {t.swipeLoadError}
              </div>
            )}

            {!loading && !isDone && current && (
              <>
                {/* Deux cartes d'aperçu derrière la carte active, pour un vrai
                    effet de pile plutôt qu'un simple double contour. */}
                {afterNext && (
                  <div className="absolute inset-0 translate-y-4 scale-[0.9] rounded-2xl border border-ink-line bg-paper opacity-40" />
                )}
                {next && (
                  <div className="absolute inset-0 translate-y-2 scale-[0.95] rounded-2xl border border-ink-line bg-paper opacity-70 shadow-[0_8px_20px_rgba(18,21,26,0.08)]" />
                )}

                {/* Carte active. Le glisser-déposer ne démarre que depuis la
                    photo (nom/ville/tags inclus, superposés dessus) : le
                    contenu en dessous (description, réseaux) garde un
                    défilement et une sélection de texte tactiles normaux. */}
                <div
                  className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_20px_50px_rgba(18,21,26,0.22)]"
                  style={{
                    transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`,
                    transition: dragging ? 'none' : 'transform 320ms cubic-bezier(0.22,1,0.36,1), opacity 260ms ease',
                    opacity: exitDirection ? 0 : 1,
                  }}
                >
                  <div
                    className="relative h-[68%] w-full shrink-0 touch-none select-none bg-paper-soft"
                    style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  >
                    {getImageSrc(current.properties.image) && !imageError ? (
                      <img
                        src={getImageSrc(current.properties.image)!}
                        alt={current.properties.name}
                        draggable={false}
                        className="h-full w-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-soft to-paper-soft text-5xl font-display font-bold text-accent">
                        {getInitials(current.properties.name)}
                      </div>
                    )}

                    {/* Voile dégradé + nom/ville/distance superposés en bas de
                        la photo, façon carte de rencontre. */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-3 pt-10">
                      <h3 className="m-0 truncate font-display text-lg font-bold uppercase tracking-tight text-white sm:text-xl">
                        {current.properties.name}
                      </h3>
                      {(current.properties.city || currentDistanceKm !== null) && (
                        <p className="m-0 mt-0.5 flex items-center gap-2 text-xs text-white/85 sm:text-sm">
                          {current.properties.city && <span>📍 {current.properties.city}</span>}
                          {currentDistanceKm !== null && (
                            <span className="font-stat text-sm tracking-wide text-accent sm:text-base">
                              {formatDistanceKm(currentDistanceKm)}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Repères fixes qui rappellent, dès l'arrivée sur la carte (sans avoir
                        besoin de commencer à glisser), quel côté correspond à quelle action. */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-2 text-[9px] font-bold uppercase tracking-wide text-white/70">
                      <span>{t.swipeImageSkip}</span>
                      <span>{t.swipeImageLike}</span>
                    </div>

                    {/* Timbres LIKE (cœur) / PASS (croix), qui apparaissent en glissant */}
                    <div
                      className="absolute left-4 top-4 flex h-16 w-16 rotate-[-18deg] items-center justify-center rounded-2xl border-[3px] border-accent bg-white/95 text-3xl shadow-[0_6px_20px_rgba(255,85,0,0.35)]"
                      style={{ opacity: likeOpacity }}
                    >
                      ❤️
                    </div>
                    <div
                      className="absolute right-4 top-4 flex h-16 w-16 rotate-[18deg] items-center justify-center rounded-2xl border-[3px] border-red-400 bg-white/95 text-3xl text-red-400 shadow-[0_6px_20px_rgba(248,113,113,0.35)]"
                      style={{ opacity: passOpacity }}
                    >
                      ✕
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 pb-4 pt-2.5">
                    {current.properties.frequency && (
                      <div className="inline-block w-fit rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-paper sm:text-xs">
                        ⏰ {current.properties.frequency}
                      </div>
                    )}
                    {current.properties.description && (
                      <p className="m-0 line-clamp-2 text-xs leading-snug text-concrete sm:text-sm">
                        {current.properties.description}
                      </p>
                    )}

                    {current.properties.social && Object.values(current.properties.social).some(Boolean) && (
                      <div className="mt-auto flex flex-wrap gap-1.5 pt-1.5">
                        {current.properties.social.website && (
                          <a href={current.properties.social.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent no-underline">
                            <SocialIcon network="website" className="h-2.5 w-2.5" /> {t.site}
                          </a>
                        )}
                        {current.properties.social.instagram && (
                          <a href={current.properties.social.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-ink-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink no-underline">
                            <SocialIcon network="instagram" className="h-2.5 w-2.5" /> Instagram
                          </a>
                        )}
                        {current.properties.social.strava && (
                          <a href={current.properties.social.strava} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-ink-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink no-underline">
                            <SocialIcon network="strava" className="h-2.5 w-2.5" /> Strava
                          </a>
                        )}
                        {current.properties.social.facebook && (
                          <a href={current.properties.social.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-ink-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink no-underline">
                            <SocialIcon network="facebook" className="h-2.5 w-2.5" /> Facebook
                          </a>
                        )}
                        {current.properties.social.whatsapp && (
                          <a href={current.properties.social.whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-ink-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink no-underline">
                            <SocialIcon network="whatsapp" className="h-2.5 w-2.5" /> WhatsApp
                          </a>
                        )}
                        {current.properties.social.tiktok && (
                          <a href={current.properties.social.tiktok} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-ink-line px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink no-underline">
                            <SocialIcon network="tiktok" className="h-2.5 w-2.5" /> TikTok
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
                  className={`flex h-28 w-28 items-center justify-center rounded-full border-8 bg-white/95 text-6xl shadow-[0_10px_40px_rgba(18,21,26,0.3)] ${
                    burst === 'like' ? 'border-accent' : 'border-red-400 text-red-400'
                  }`}
                  style={{ animation: 'club-swipe-burst 650ms ease-out forwards' }}
                >
                  {burst === 'like' ? '❤️' : '✕'}
                </div>
              </div>
            )}

            {!loading && isDone && (
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-ink-line bg-paper px-6 text-center shadow-[0_20px_50px_rgba(18,21,26,0.12)]">
                <span className="text-4xl">🏁</span>
                {likedClubs.length > 0 && (
                  <div className="flex -space-x-3">
                    {likedClubs.slice(0, 5).map((club) => {
                      const src = getImageSrc(club.properties.image);
                      return (
                        <div
                          key={clubKey(club)}
                          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-paper bg-accent-soft text-xs font-bold text-accent shadow-sm"
                        >
                          {src ? (
                            <img src={src} alt="" className="h-full w-full object-cover" />
                          ) : (
                            getInitials(club.properties.name)
                          )}
                        </div>
                      );
                    })}
                    {likedClubs.length > 5 && (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-paper bg-ink text-xs font-bold text-paper shadow-sm">
                        +{likedClubs.length - 5}
                      </div>
                    )}
                  </div>
                )}
                <p className="m-0 font-display text-lg font-bold uppercase tracking-tight text-ink">
                  {likedClubs.length > 0
                    ? `${t.swipeYouLiked} ${likedClubs.length} club${likedClubs.length > 1 ? 's' : ''}${language === 'fr' ? ' !' : '!'}`
                    : t.swipeNoFavorites}
                </p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={restart}
                    className="rounded-full bg-accent px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-ink shadow-[0_10px_24px_rgba(255,85,0,0.28)] transition-transform hover:-translate-y-0.5"
                  >
                    {t.swipeReplay}
                  </button>
                  {canUndo && (
                    <button
                      type="button"
                      onClick={undoLastSwipe}
                      className="text-[11px] font-bold uppercase tracking-wide text-concrete hover:text-accent"
                    >
                      {t.swipeReviewLast}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Boutons d'action, alternative accessible au glisser-déposer.
              Annuler / Passer / Aimer, comme les trois boutons d'une vraie
              appli de swipe — chacun garde sa légende visible en dessous. */}
          {!loading && !isDone && current && (
            <div className="mx-auto mt-4 flex shrink-0 items-center justify-center gap-5 sm:gap-7">
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-label={t.swipeUndo}
                  disabled={!canUndo}
                  onClick={undoLastSwipe}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink-line bg-paper text-lg text-concrete shadow-sm transition-transform enabled:hover:-translate-y-0.5 enabled:hover:border-ink enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
                >
                  ↺
                </button>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-label={t.swipePassAriaCurrent}
                  onClick={() => commitSwipe('pass')}
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink-line bg-paper text-2xl text-ink shadow-[0_8px_20px_rgba(18,21,26,0.1)] transition-transform hover:-translate-y-0.5 hover:border-red-300 hover:text-red-400"
                >
                  ✕
                </button>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-concrete">{t.swipePassCaption}</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button
                  type="button"
                  aria-label={t.swipeLikeAriaCurrent}
                  onClick={() => commitSwipe('like')}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl text-ink shadow-[0_10px_24px_rgba(255,85,0,0.35)] transition-transform hover:-translate-y-0.5"
                >
                  ❤️
                </button>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">{t.swipeLikeCaption}</span>
              </div>
            </div>
          )}
        </div>

        {/* Colonne clubs likés : à droite dès lg, en dessous sur mobile/tablette. */}
        {likedClubs.length > 0 && (
          <div className="flex w-full max-w-xs flex-col sm:max-w-sm lg:w-72 lg:min-h-0 lg:shrink-0">
            <div className="flex shrink-0 items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-concrete">
                {t.swipeLikedClubsTitle} ({likedClubs.length})
              </h3>
              <button
                type="button"
                onClick={() => setLikedKeys([])}
                className="text-[11px] font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-accent"
              >
                {t.swipeClearAll}
              </button>
            </div>

            <div className="mt-3 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-ink-line bg-paper-soft p-2 [scrollbar-color:#FF5500_#e6e7e1] [scrollbar-width:thin] sm:grid-cols-3 lg:min-h-0 lg:max-h-none lg:flex-1 lg:grid-cols-1">
              {likedClubs.map((club) => {
                const key = clubKey(club);
                const distanceKm = clubDistanceKm(club, userLocation);
                const src = getImageSrc(club.properties.image);
                return (
                  <div
                    key={key}
                    className="relative flex items-start gap-2 rounded-lg border border-ink-line bg-paper p-2.5 pr-6 shadow-sm transition-shadow hover:shadow-[0_6px_16px_rgba(18,21,26,0.1)] lg:items-center"
                  >
                    <div className="hidden h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-[10px] font-bold text-accent lg:flex">
                      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : getInitials(club.properties.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        aria-label={`${t.swipeRemoveFromFavoritesAria} ${club.properties.name} ${t.swipeFromFavoritesSuffix}`}
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

                      {/* Petites icônes réseaux, pour retrouver le club sans revenir au swipe */}
                      {club.properties.social && Object.values(club.properties.social).some(Boolean) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {club.properties.social.website && (
                            <a
                              href={club.properties.social.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t.site}
                              aria-label={`${t.site} — ${club.properties.name}`}
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-accent p-1 text-accent no-underline"
                            >
                              <SocialIcon network="website" />
                            </a>
                          )}
                          {club.properties.social.instagram && (
                            <a
                              href={club.properties.social.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Instagram"
                              aria-label={`Instagram — ${club.properties.name}`}
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-ink-line p-1 text-ink no-underline"
                            >
                              <SocialIcon network="instagram" />
                            </a>
                          )}
                          {club.properties.social.facebook && (
                            <a
                              href={club.properties.social.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Facebook"
                              aria-label={`Facebook — ${club.properties.name}`}
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-ink-line p-1 text-ink no-underline"
                            >
                              <SocialIcon network="facebook" />
                            </a>
                          )}
                          {club.properties.social.strava && (
                            <a
                              href={club.properties.social.strava}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Strava"
                              aria-label={`Strava — ${club.properties.name}`}
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-ink-line p-1 text-ink no-underline"
                            >
                              <SocialIcon network="strava" />
                            </a>
                          )}
                          {club.properties.social.whatsapp && (
                            <a
                              href={club.properties.social.whatsapp}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="WhatsApp"
                              aria-label={`WhatsApp — ${club.properties.name}`}
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-ink-line p-1 text-ink no-underline"
                            >
                              <SocialIcon network="whatsapp" />
                            </a>
                          )}
                          {club.properties.social.tiktok && (
                            <a
                              href={club.properties.social.tiktok}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="TikTok"
                              aria-label={`TikTok — ${club.properties.name}`}
                              className="flex h-5 w-5 items-center justify-center rounded-full border border-ink-line p-1 text-ink no-underline"
                            >
                              <SocialIcon network="tiktok" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
