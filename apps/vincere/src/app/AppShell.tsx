import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Command, Menu, Plus, Search, X } from 'lucide-react';
import { navigation } from './navigation';
import { can } from '../auth/permissions';
import { EnvironmentBadge } from '../components/EnvironmentBadge';
import { Modal } from '../components/ui';
import { ContactForm } from '../features/contacts/ContactForm';
import { useAppStore } from './AppStore';

const roleLabel = {
  owner: 'Founder · Owner',
  admin: 'Administration',
  agent: 'Immobilienvertrieb',
  viewer: 'Lesezugriff',
} as const;

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const location = useLocation();
  const navigate = useNavigate();
  const { contacts, currentUser, workspace } = useAppStore();

  const current = navigation.find((item) => item.path === location.pathname) ?? navigation[0];
  const initials = currentUser.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const contactSearchIndex = useMemo(() => contacts.map((contact) => ({
    contact,
    searchable: `${contact.firstName} ${contact.lastName} ${contact.city} ${contact.role}`.toLowerCase(),
  })), [contacts]);

  const results = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return [];
    return [
      ...navigation.filter((item) => item.label.toLowerCase().includes(normalized)).map((item) => ({ label: item.label, path: item.path, hint: 'Bereich' })),
      ...contactSearchIndex.filter((entry) => entry.searchable.includes(normalized)).slice(0, 5).map(({ contact }) => ({ label: `${contact.firstName} ${contact.lastName}`, path: '/contacts', hint: `${contact.role} · ${contact.city}` })),
    ].slice(0, 8);
  }, [contactSearchIndex, deferredQuery]);

  const closeCommand = useCallback(() => {
    setCommandOpen(false);
    setQuery('');
  }, []);

  const closeContactForm = useCallback(() => setNewContactOpen(false), []);

  useEffect(() => {
    const openCommand = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener('keydown', openCommand);
    return () => document.removeEventListener('keydown', openCommand);
  }, []);

  const selectCommand = (path: string) => {
    navigate(path);
    closeCommand();
  };

  const canCreateContact = can(currentUser, 'contacts:write');

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Menü schließen"><X /></button>
        <Link to="/" className="brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark">V</span>
          <span><strong>VINCERE</strong><small>REAL ESTATE SALES OS</small></span>
        </Link>
        <nav className="main-nav" aria-label="Hauptnavigation">
          {navigation.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === '/'} onClick={() => setMobileOpen(false)}>
              <Icon size={19} strokeWidth={1.65} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-watermark" aria-hidden="true">V</div>
        <div className="profile-card" title={`${workspace.name} · ${workspace.region}`}>
          <div className="avatar" aria-hidden="true">{initials}</div>
          <div><strong>{currentUser.name}</strong><span>{roleLabel[currentUser.role]}</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Menü öffnen" aria-expanded={mobileOpen}><Menu /></button>
          <div className="page-heading"><span>{current.label === 'Übersicht' ? 'VINCERE Command Center' : current.label}</span><small>{new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</small></div>
          <EnvironmentBadge />
          <button className="command-trigger" onClick={() => setCommandOpen(true)} aria-haspopup="dialog" aria-expanded={commandOpen}><Search size={17} /><span>Suchen oder Befehl ausführen …</span><kbd><Command size={12} /> K</kbd></button>
          <button className="button button-primary topbar-action" onClick={() => setNewContactOpen(true)} disabled={!canCreateContact} title={canCreateContact ? undefined : 'Für diese Rolle ist nur Lesezugriff freigegeben.'}><Plus size={18} /> Neuer Kontakt</button>
        </header>
        <div className="page-container"><Outlet /></div>
      </main>

      {newContactOpen && <Modal title="Neuen Kontakt erfassen" onClose={closeContactForm}><ContactForm onDone={closeContactForm} /></Modal>}
      {commandOpen && (
        <Modal title="Command Palette" onClose={closeCommand}>
          <div className="command-panel">
            <div className="command-input"><Search size={18} aria-hidden="true" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bereich, Kontakt oder Aktion suchen" aria-label="VINCERE durchsuchen" /></div>
            <div className="command-results" aria-live="polite">
              {query && results.length === 0 && <div className="empty-state">Keine passenden Ergebnisse.</div>}
              {results.map((result) => <button key={`${result.path}-${result.label}`} onClick={() => selectCommand(result.path)}><span>{result.label}</span><small>{result.hint}</small></button>)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
