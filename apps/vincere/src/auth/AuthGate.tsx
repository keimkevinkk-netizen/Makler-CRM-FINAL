import { useState, type FormEvent, type ReactNode } from 'react';
import { KeyRound, LockKeyhole, LogOut } from 'lucide-react';
import { useAuth } from './AuthContext';

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [displayName, setDisplayName] = useState('');

  if (!auth.configured) return children;

  if (auth.loading && !auth.session) {
    return <div className="auth-screen"><div className="auth-loading"><span className="brand-mark">V</span><strong>VINCERE wird gesichert geladen …</strong></div></div>;
  }

  if (auth.session && !auth.membership) {
    const accept = async (event: FormEvent) => {
      event.preventDefault();
      await auth.acceptInvitation(token, displayName).catch(() => undefined);
    };
    return (
      <main className="auth-screen">
        <section className="auth-card invitation-acceptance-card">
          <div className="auth-brand"><span className="brand-mark">V</span><div><strong>VINCERE</strong><small>REAL ESTATE SALES OS</small></div></div>
          <div className="auth-icon"><KeyRound /></div>
          <h1>Workspace-Einladung aktivieren</h1>
          <p>Sie sind als <strong>{auth.session.email}</strong> angemeldet. Das Token wird serverseitig geprüft, ist workspacegebunden und nur bis zum Ablaufdatum gültig.</p>
          <form onSubmit={(event) => void accept(event)}>
            <label>Anzeigename<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} /></label>
            <label>Einladungstoken<input value={token} onChange={(event) => setToken(event.target.value)} required minLength={32} autoComplete="one-time-code" /></label>
            {auth.error && <div className="auth-error" role="alert">{auth.error}</div>}
            <button className="button button-primary" disabled={auth.loading}>{auth.loading ? 'Einladung wird geprüft …' : 'Einladung annehmen'}</button>
          </form>
          <button className="button button-secondary auth-secondary-action" onClick={() => void auth.signOut()}><LogOut size={16} /> Andere Anmeldung verwenden</button>
        </section>
      </main>
    );
  }

  if (!auth.session) {
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
