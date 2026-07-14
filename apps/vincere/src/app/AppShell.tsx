import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Command, Menu, Plus, Radio, Search, ShieldAlert, WifiOff, X } from 'lucide-react';
import { can } from '../auth/permissions';
import { navigation } from './navigation';
import { Modal } from '../components/ui';
import { ContactForm } from '../features/contacts/ContactForm';
import { useAppStore } from './AppStore';

const roleLabel = {
  owner: 'Founder · Owner',
  admin: 'Administration',
  agent: 'Immobilienvertrieb',
  viewer: 'Lesezugriff',
} as const;

const realtimeLabel = {
  disabled: 'Lokalmodus',
  connecting: 'Verbindet',
  connected: 'Realtime',
  reconnecting: 'Reconnect',
  offline: 'Offline',
  error: 'Fehler',
} as const;

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { contacts, currentUser, workspace, realtimeSync, conflicts } = useAppStore();
  const canCreateContact = can(currentUser, 'contacts:write');

  const current = navigation.find((item) => item.path === location.pathname) ?? navigation[0];
  const initials = currentUser.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return [
      ...navigation.filter((item) => item.label.toLowerCase().includes(normalized)).map((item) => ({ label: item.label, path: item.path, hint: 'Bereich' })),
      ...contacts.filter((contact) => `${contact.firstName} ${contact.lastName} ${contact.city}`.toLowerCase().includes(normalized)).slice(0, 5).map((contact) => ({ label: `${contact.firstName} ${contact.lastName}`, path: '/contacts', hint: `${contact.role} · ${contact.city}` })),
    ].slice(0, 8);
  }, [contacts, query]);

  const selectCommand = (path: string) => {
    navigate(path);
    setCommandOpen(false);
    setQuery('');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Menü schließen"><X /></button>
        <Link to="/" className="brand" onClick={() => setMobileOpen(false)}>
          <span className="brand-mark">V</span>
          <span><strong>VINCERE</strong><small>REAL ESTATE SALES OS</small></span>
        </Link>
        <nav className="main-nav">
          {navigation.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} end={path === '/'} onClick={() => setMobileOpen(false)}>
              <Icon size={19} strokeWidth={1.65} /><span>{label}</span>
              {path === '/conflicts' && conflicts.length > 0 && <b className="nav-count">{conflicts.length}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-watermark">V</div>
        <div className="profile-card" title={`${workspace.name} · ${workspace.region}`}>
          <div className="avatar">{initials}</div>
          <div><strong>{currentUser.name}</strong><span>{roleLabel[currentUser.role]}</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Menü öffnen"><Menu /></button>
          <div className="page-heading"><span>{current.label === 'Übersicht' ? 'VINCERE Command Center' : current.label}</span><small>{new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</small></div>
          <button className="command-trigger" onClick={() => setCommandOpen(true)}><Search size={17} /><span>Suchen oder Befehl ausführen …</span><kbd><Command size={12} /> K</kbd></button>
          <div className="topbar-actions">
            <Link to={conflicts.length ? '/conflicts' : '/settings'} className={`realtime-pill realtime-${realtimeSync.status}`} title={realtimeSync.error}>
              {conflicts.length ? <ShieldAlert size={15} /> : realtimeSync.status === 'offline' || realtimeSync.status === 'error' ? <WifiOff size={15} /> : <Radio size={15} />}
              <span>{conflicts.length ? `${conflicts.length} Konflikt${conflicts.length === 1 ? '' : 'e'}` : realtimeLabel[realtimeSync.status]}</span>
            </Link>
            {canCreateContact && <button className="button button-primary topbar-action" onClick={() => setNewContactOpen(true)}><Plus size={18} /> Neuer Kontakt</button>}
          </div>
        </header>
        <div className="page-container"><Outlet /></div>
      </main>

      {newContactOpen && <Modal title="Neuen Kontakt erfassen" onClose={() => setNewContactOpen(false)}><ContactForm onDone={() => setNewContactOpen(false)} /></Modal>}
      {commandOpen && (
        <Modal title="Command Palette" onClose={() => setCommandOpen(false)}>
          <div className="command-panel">
            <div className="command-input"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bereich, Kontakt oder Aktion suchen" /></div>
            <div className="command-results">
              {query && results.length === 0 && <div className="empty-state">Keine passenden Ergebnisse.</div>}
              {results.map((result) => <button key={`${result.path}-${result.label}`} onClick={() => selectCommand(result.path)}><span>{result.label}</span><small>{result.hint}</small></button>)}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
