import { useState, type FormEvent, type ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useAuth } from './AuthContext';

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (!auth.configured) return children;

  if (auth.loading && !auth.session) {
    return <div className="auth-screen"><div className="auth-loading"><span className="brand-mark">V</span><strong>VINCERE wird gesichert geladen …</strong></div></div>;
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
          <form onSubmit={(event) => void submit(event)}>
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
