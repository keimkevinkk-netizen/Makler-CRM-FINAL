import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Plus, X } from 'lucide-react';
import { navigation } from './navigation';
import { Modal } from '../components/ui';
import { ContactForm } from '../features/contacts/ContactForm';
import { GlobalSearchCommandCenter } from '../features/search/GlobalSearchCommandCenter';
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
  const location = useLocation();
  const { currentUser, workspace } = useAppStore();

  const current = navigation.find((item) => item.path === location.pathname) ?? navigation[0];
  const initials = currentUser.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

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
          <GlobalSearchCommandCenter onNewContact={() => setNewContactOpen(true)} />
          <button className="button button-primary topbar-action" onClick={() => setNewContactOpen(true)} disabled={currentUser.role === 'viewer'}><Plus size={18} /> Neuer Kontakt</button>
        </header>
        <div className="page-container"><Outlet /></div>
      </main>

      {newContactOpen && <Modal title="Neuen Kontakt erfassen" onClose={() => setNewContactOpen(false)}><ContactForm onDone={() => setNewContactOpen(false)} /></Modal>}
    </div>
  );
}
