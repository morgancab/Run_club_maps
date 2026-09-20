import { useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseAuth } from '../lib/supabaseAuthClient';

interface OwnerLoginProps {
  onSignedIn: (session: Session) => void;
}

export default function OwnerLogin({ onSignedIn }: OwnerLoginProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabaseAuth) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);

    if (mode === 'login') {
      const { data, error: signInError } = await supabaseAuth.auth.signInWithPassword({ email, password });
      setSubmitting(false);
      if (signInError || !data.session) {
        setError('Identifiants incorrects.');
        return;
      }
      onSignedIn(data.session);
      return;
    }

    const { data, error: signUpError } = await supabaseAuth.auth.signUp({ email, password });
    setSubmitting(false);
    if (signUpError) {
      setError(
        signUpError.message === 'User already registered' ? 'Un compte existe déjà avec cet email.' : signUpError.message
      );
      return;
    }
    if (data.session) {
      onSignedIn(data.session);
      return;
    }
    setInfo('Compte créé ! Vérifiez vos emails pour confirmer votre adresse avant de vous connecter.');
    setMode('login');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-10%] h-[360px] w-[360px] rounded-full bg-accent/10 blur-[110px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-[-10%] h-[280px] w-[280px] rounded-full bg-accent/10 blur-[100px]"
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm rounded-xl border border-ink-line bg-paper p-7 shadow-[0_20px_60px_rgba(18,21,26,0.12)]"
      >
        <a
          href="/"
          className="block text-xs font-semibold uppercase tracking-wide text-concrete transition-colors hover:text-accent"
        >
          ← Retour au site
        </a>

        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          Espace partenaire
        </span>

        <h1 className="mt-3 font-display text-2xl font-bold uppercase leading-tight tracking-tight text-ink">
          Gère ton <span className="text-accent">club</span>
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-concrete">
          Mets à jour les infos affichées sur Run Club Maps : horaires, description, logo, réseaux sociaux.
        </p>

        <div className="mt-6 flex gap-1 rounded-md border border-ink-line bg-paper-soft p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 rounded-sm py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              mode === 'login' ? 'bg-paper text-ink shadow-sm' : 'text-concrete hover:text-ink'
            }`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 rounded-sm py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
              mode === 'signup' ? 'bg-paper text-ink shadow-sm' : 'text-concrete hover:text-ink'
            }`}
          >
            Créer un compte
          </button>
        </div>

        <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-concrete" htmlFor="owner-email">
          Email
        </label>
        <input
          id="owner-email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-ink-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />

        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-concrete" htmlFor="owner-password">
          Mot de passe
        </label>
        <input
          id="owner-password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-ink-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />

        {mode === 'signup' && (
          <p className="mt-3 text-xs leading-relaxed text-concrete">
            Utilisez l'email que vous avez communiqué pour la gestion de votre club — c'est lui qui permet de vous
            associer automatiquement à votre fiche.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
        {info && (
          <p className="mt-3 rounded-md border border-accent/30 bg-accent-soft px-3 py-2 text-xs text-accent">{info}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-md bg-accent px-4 py-3 text-sm font-bold uppercase tracking-wide text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting ? 'Patientez…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>
    </div>
  );
}
