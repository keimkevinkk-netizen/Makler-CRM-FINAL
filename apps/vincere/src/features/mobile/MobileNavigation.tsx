import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Building2,
  CalendarDays,
  ContactRound,
  Gauge,
  Handshake,
  Megaphone,
  MoreHorizontal,
  PhoneCall,
  Scale,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

const primaryItems = [
  { label: 'Heute', path: '/today', icon: Gauge, mode: undefined },
  { label: 'Kontakte', path: '/contacts', icon: ContactRound, mode: undefined },
  { label: 'Anruf', path: '/phone', icon: PhoneCall, mode: undefined },
  { label: 'Termine', path: '/today?mobile=appointments', icon: CalendarDays, mode: 'appointments' },
  { label: 'Immobilien', path: '/properties', icon: Building2, mode: undefined },
] as const;

const moreItems = [
  { label: 'Übersicht', path: '/', icon: Gauge },
  { label: 'Pipeline', path: '/pipeline', icon: Scale },
  { label: 'Bewertungen', path: '/valuations', icon: Sparkles },
  { label: 'Netzwerk', path: '/network', icon: Handshake },
  { label: 'Kampagnen', path: '/campaigns', icon: Megaphone },
  { label: 'Wissen', path: '/knowledge', icon: BookOpen },
  { label: 'Konflikte', path: '/conflicts', icon: ShieldAlert },
  { label: 'Team', path: '/team', icon: Users },
  { label: 'Einstellungen', path: '/settings', icon: Settings },
] as const;

export interface MobileNavigationProps {
  onOpenQuickActions: () => void;
  version: string;
}

export function MobileNavigation({ onOpenQuickActions, version }: MobileNavigationProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const mode = new URLSearchParams(location.search).get('mobile');

  const isActive = (path: string, itemMode?: string) => {
    const pathname = path.split('?')[0];
    if (itemMode) return location.pathname === pathname && mode === itemMode;
    if (pathname === '/today') return location.pathname === pathname && mode !== 'appointments';
    return location.pathname === pathname;
  };

  return (
    <>
      <button
        type="button"
        className="mobile-quick-action-trigger"
        onClick={onOpenQuickActions}
        aria-label="Mobile Schnellaktionen öffnen"
      >
        <Sparkles size={20} />
      </button>

      <nav className="mobile-bottom-nav" aria-label="Mobile Hauptnavigation">
        {primaryItems.map(({ label, path, icon: Icon, mode: itemMode }) => (
          <Link
            key={`${label}-${path}`}
            to={path}
            className={isActive(path, itemMode) ? 'active' : undefined}
            aria-current={isActive(path, itemMode) ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={1.8} />
            <span>{label}</span>
          </Link>
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} aria-expanded={moreOpen}>
          <MoreHorizontal size={20} strokeWidth={1.8} />
          <span>Mehr</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="mobile-sheet-backdrop" role="presentation" onMouseDown={() => setMoreOpen(false)}>
          <section className="mobile-sheet" role="dialog" aria-modal="true" aria-label="Weitere Bereiche" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><strong>Weitere Bereiche</strong><small>VINCERE v{version}</small></div>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="Weitere Bereiche schließen"><X /></button>
            </header>
            <div className="mobile-more-grid">
              {moreItems.map(({ label, path, icon: Icon }) => (
                <Link key={path} to={path} onClick={() => setMoreOpen(false)}>
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
