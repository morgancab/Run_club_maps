import { useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseAuth } from '../lib/supabaseAuthClient';

interface AdminLoginProps {
  onSignedIn: (session: Session) => void;
}

export default function AdminLogin({ onSignedIn }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabaseAuth) return;
    setSubmitting(true);
    setError(null);
    const { data, error: signInError } = await supabaseAuth.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError || !data.session) {
      setError('Identifiants incorrects.');
      return;
    }
    onSignedIn(data.session);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-ink-line bg-paper p-6 shadow-[0_20px_60px_rgba(18,21,26,0.15)]"
      >
        <h1 className="font-display text-lg font-bold uppercase tracking-tight text-ink">Administration</h1>
        <p className="mt-1 text-sm text-concrete">Run Club Maps</p>

        <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-concrete" htmlFor="admin-email">
          Email
        </label>
        <input
          id="admin-email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-ink-line px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />

        <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-concrete" htmlFor="admin-password">
          Mot de passe
        </label>
        <input
          id="admin-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-ink-line px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-md bg-accent px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
