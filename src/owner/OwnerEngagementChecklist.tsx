const VIEW_GOAL = 5;

interface OwnerEngagementChecklistProps {
  missingLabels: string[];
  viewCount: number;
  shareCount: number;
}

interface Step {
  key: string;
  icon: string;
  title: string;
  detail: string;
  done: boolean;
}

// Trois paliers concrets, volontairement atteignables même à faible trafic
// (5 vues, pas 500) : pousse activement le club à compléter sa fiche ET à en
// parler sur ses propres réseaux, plutôt que de se contenter d'afficher des
// compteurs passifs. Toujours visible (pas caché derrière un onglet) : c'est
// le but même du widget.
export default function OwnerEngagementChecklist({ missingLabels, viewCount, shareCount }: OwnerEngagementChecklistProps) {
  const profileComplete = missingLabels.length === 0;
  const viewsReached = viewCount >= VIEW_GOAL;
  const shared = shareCount > 0;

  const steps: Step[] = [
    {
      key: 'complete',
      icon: '📋',
      title: 'Complète ton profil',
      detail: profileComplete ? 'Fiche complète !' : `Il manque : ${missingLabels.join(', ')}`,
      done: profileComplete,
    },
    {
      key: 'views',
      icon: '👀',
      title: 'Atteins 5 vues sur la carte',
      detail: viewsReached ? 'Objectif atteint !' : `${viewCount}/${VIEW_GOAL} vues pour l'instant`,
      done: viewsReached,
    },
    {
      key: 'share',
      icon: '📣',
      title: 'Partage ton club',
      detail: shared ? 'Merci d\'en avoir parlé !' : 'Colle ton lien dans ta bio Instagram ou sur ton site',
      done: shared,
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const allDone = doneCount === steps.length;

  return (
    <div className="mx-5 mt-4 overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent-soft to-paper p-5 shadow-[0_4px_16px_rgba(255,85,0,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-tight text-ink">
          <span aria-hidden="true">🎯</span> Fais connaître ton club
        </h3>
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-ink">
          {doneCount}/{steps.length}
        </span>
      </div>

      {/* Barre segmentée : une étape = un tronçon, plus parlant qu'une simple fraction */}
      <div className="mt-3 flex gap-1.5">
        {steps.map((step) => (
          <div
            key={step.key}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${step.done ? 'bg-accent' : 'bg-ink-line'}`}
          />
        ))}
      </div>

      {allDone ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden="true">🎉</span> Bravo, tu as toutes les cartes en main !
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {steps.map((step) => (
            <li key={step.key} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base transition-colors ${
                  step.done ? 'bg-accent' : 'bg-paper shadow-[inset_0_0_0_1px_var(--color-ink-line)]'
                }`}
              >
                {step.icon}
                {step.done && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[9px] text-paper">
                    ✓
                  </span>
                )}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-sm font-semibold ${step.done ? 'text-concrete' : 'text-ink'}`}>{step.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-concrete">{step.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
