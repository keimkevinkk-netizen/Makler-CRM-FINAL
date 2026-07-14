import { useState, type FormEvent, type ReactNode } from 'react';
import { LockKeyhole, ShieldAlert } from 'lucide-react';
import { runtimeConfig } from '../config/runtime';
import { useAuth } from './AuthContext';

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const blockingIssue = runtimeConfig.issues.find((issue) => issue.severity === 'blocking');

  if (blockingIssue) {
    return (
      <main className="auth-screen">
        <section className="auth-card" role="alert">
          <div className="auth-brand"><span className="brand-mark">V</span><div><strong>VINCERE</strong><small>{runtimeConfig.environment.toUpperCase()}</small></div></div>
          <div className="auth-icon"><ShieldAlert /></div>
          <h1>Geschützter Start abgebrochen</h1>
          <p>{blockingIssue.message}</p>
          <small className="auth-security-note">VINCERE fällt in Beta oder Produktion niemals stillschweigend auf einen ungeschützten Lokalmodus zurück.</small>
        </section>
      </main>
    );
  }

  if (!auth.configured) return children;

  if (auth.loading && !auth.session) {
    return <div className="auth-screen"><div className="auth-loading" role="status"><span className="brand-mark">V</span><strong>VINCERE wird gesichert geladen …</strong></div></div>;
  }

  if (!auth.session || !auth.membership) {
    const submit = async (event: FormEvent) => {
      event.preventDefault();
      await auth.signIn(email, password).catch(() => undefined);
    };

    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="auth-brand"><span className="brand-mark">V</span><div><strong>VINCERE</strong><small>REAL ESTATE SALES OS</small></div></div>
          <div className="auth-icon"><LockKeyhole /></div>
          <h1>Sicher anmelden</h1>
          <p>Der Zugriff ist auf freigeschaltete Mitglieder des VINCERE-Workspaces beschränkt.</p>
          <form onSubmit={(event) => void submit(event)} aria-busy={auth.loading}>
            <label>E-Mail<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Passwort<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
            {auth.error && <div className="auth-error" role="alert">{auth.error}</div>}
            <button className="button button-primary" disabled={auth.loading}>{auth.loading ? 'Anmeldung läuft …' : 'Anmelden'}</button>
          </form>
          <small className="auth-security-note">Sitzung und Workspace-Zugehörigkeit werden gegen das Cloud-Backend geprüft.</small>
        </section>
      </main>
    );
  }

  return children;
}
