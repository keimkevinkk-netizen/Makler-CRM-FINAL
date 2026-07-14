import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { ArrowRight, Command, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../app/AppStore';
import type { AppState } from '../../types/domain';
import { buildSearchIndex, searchIndex, type SearchRecordType, type SearchResult } from '../../domain/search/searchIndex';
import { searchCommands, type CommandDefinition } from '../commands/commandRegistry';
import './global-search.css';

interface GlobalSearchCommandCenterProps {
  onNewContact: () => void;
}

interface GlobalSearchCommandCenterViewProps {
  state: AppState;
  onNavigate: (path: string) => void;
  onNewContact: () => void;
  defaultOpen?: boolean;
}

type PaletteFilter = 'all' | 'command' | SearchRecordType;

type PaletteItem =
  | { key: string; kind: 'command'; command: CommandDefinition }
  | { key: string; kind: 'result'; result: SearchResult };

const typeLabels: Record<SearchRecordType, string> = {
  contact: 'Kontakte',
  property: 'Immobilien',
  followup: 'Follow-ups',
  appointment: 'Termine',
  call: 'Anrufe',
  pipeline: 'Pipeline',
  network: 'Netzwerk',
  valuation: 'Bewertungen',
  'next-action': 'Nächste Aktionen',
};

const resultRoutes: Record<SearchRecordType, string> = {
  contact: '/contacts',
  property: '/properties',
  followup: '/contacts',
  appointment: '/today',
  call: '/phone',
  pipeline: '/pipeline',
  network: '/network',
  valuation: '/valuations',
  'next-action': '/today',
};

export function GlobalSearchCommandCenter({ onNewContact }: GlobalSearchCommandCenterProps) {
  const state = useAppStore();
  const navigate = useNavigate();
  return <GlobalSearchCommandCenterView state={state} onNavigate={navigate} onNewContact={onNewContact} />;
}

export function GlobalSearchCommandCenterView({
  state,
  onNavigate,
  onNewContact,
  defaultOpen = false,
}: GlobalSearchCommandCenterViewProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PaletteFilter>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const index = useMemo(() => buildSearchIndex(state, { includeContactNotes: false }), [state]);
  const availableTypes = useMemo(
    () => [...new Set(index.map((entry) => entry.type))].sort((left, right) => typeLabels[left].localeCompare(typeLabels[right], 'de-DE')),
    [index],
  );

  const dataResults = useMemo(() => {
    if (!query.trim() || filter === 'command') return [];
    const types = filter === 'all' ? undefined : [filter];
    return searchIndex(index, query, { workspaceId: state.workspace.id, types, limit: 24 });
  }, [filter, index, query, state.workspace.id]);

  const commandResults = useMemo(() => {
    if (filter !== 'all' && filter !== 'command') return [];
    return searchCommands(state.currentUser.role, query).slice(0, query.trim() ? 8 : 10);
  }, [filter, query, state.currentUser.role]);

  const items = useMemo<PaletteItem[]>(() => [
    ...commandResults.map((command) => ({ key: `command:${command.id}`, kind: 'command' as const, command })),
    ...dataResults.map((result) => ({ key: result.id, kind: 'result' as const, result })),
  ], [commandResults, dataResults]);

  const closePalette = () => {
    setOpen(false);
    setQuery('');
    setFilter('all');
    window.setTimeout(() => restoreFocusRef.current?.focus(), 0);
  };

  const openPalette = () => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  };

  useEffect(() => {
    const onGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
        event.preventDefault();
        if (open) closePalette(); else openPalette();
      } else if (open && event.key === 'Escape') {
        event.preventDefault();
        closePalette();
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  });

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  const safeActiveIndex = Math.min(activeIndex, Math.max(0, items.length - 1));

  const runItem = (item: PaletteItem | undefined) => {
    if (!item) return;
    closePalette();
    if (item.kind === 'command') {
      if (item.command.action.kind === 'new-contact') onNewContact();
      else onNavigate(item.command.action.path);
      return;
    }
    onNavigate(resultRoutes[item.result.type]);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => items.length ? (current + 1) % items.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => items.length ? (current - 1 + items.length) % items.length : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runItem(items[safeActiveIndex]);
    }
  };

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button className="command-trigger" onClick={openPalette} aria-haspopup="dialog" aria-expanded={open}>
        <Search size={17} /><span>Suchen oder Befehl ausführen …</span><kbd><Command size={12} /> K</kbd>
      </button>

      {open && (
        <div className="global-search-backdrop" role="presentation" onMouseDown={closePalette}>
          <div
            ref={dialogRef}
            className="global-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-title"
            onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => event.stopPropagation()}
            onKeyDown={trapFocus}
          >
            <header className="global-search-header">
              <div><span className="global-search-eyebrow">VINCERE COMMAND CENTER</span><h2 id="global-search-title">Globale Suche</h2></div>
              <button className="global-search-close" onClick={closePalette} aria-label="Globale Suche schließen"><X size={20} /></button>
            </header>

            <div className="global-search-input-wrap">
              <Search size={20} aria-hidden="true" />
              <input
                ref={inputRef}
                role="combobox"
                aria-label="VINCERE global durchsuchen"
                aria-autocomplete="list"
                aria-controls="global-search-results"
                aria-expanded="true"
                aria-activedescendant={items[safeActiveIndex] ? `global-search-option-${safeActiveIndex}` : undefined}
                value={query}
                onChange={(event: ChangeEvent<HTMLInputElement>) => { setQuery(event.target.value); setActiveIndex(0); }}
                onKeyDown={onInputKeyDown}
                placeholder="Name, Telefonnummer, E-Mail, Objekt, Termin oder Befehl"
              />
              <kbd>ESC</kbd>
            </div>

            <div className="global-search-filters" aria-label="Ergebnistyp filtern">
              <button className={filter === 'all' ? 'is-active' : ''} onClick={() => { setFilter('all'); setActiveIndex(0); }} aria-pressed={filter === 'all'}>Alle</button>
              <button className={filter === 'command' ? 'is-active' : ''} onClick={() => { setFilter('command'); setActiveIndex(0); }} aria-pressed={filter === 'command'}>Befehle</button>
              {availableTypes.map((type) => (
                <button key={type} className={filter === type ? 'is-active' : ''} onClick={() => { setFilter(type); setActiveIndex(0); }} aria-pressed={filter === type}>{typeLabels[type]}</button>
              ))}
            </div>

            <div className="global-search-meta" role="status" aria-live="polite">
              <span>{query.trim() ? `${items.length} Treffer` : 'Schnellbefehle'}</span>
              <span><kbd>↑↓</kbd> auswählen <kbd>↵</kbd> öffnen</span>
            </div>

            <div id="global-search-results" className="global-search-results" role="listbox" aria-label="Suchergebnisse">
              {items.length === 0 && (
                <div className="global-search-empty">
                  <strong>Keine passenden Ergebnisse</strong>
                  <span>Suche mit Name, Ort, Telefonnummer, E-Mail oder einem kürzeren Begriff.</span>
                </div>
              )}

              {items.map((item, indexPosition) => {
                const active = indexPosition === safeActiveIndex;
                if (item.kind === 'command') {
                  return (
                    <button
                      id={`global-search-option-${indexPosition}`}
                      key={item.key}
                      role="option"
                      aria-selected={active}
                      className={`global-search-result ${active ? 'is-active' : ''}`}
                      onMouseEnter={() => setActiveIndex(indexPosition)}
                      onClick={() => runItem(item)}
                    >
                      <span className="global-search-type">Befehl</span>
                      <span className="global-search-copy"><strong>{item.command.label}</strong><small>{item.command.description}</small></span>
                      <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  );
                }
                return (
                  <button
                    id={`global-search-option-${indexPosition}`}
                    key={item.key}
                    role="option"
                    aria-selected={active}
                    className={`global-search-result ${active ? 'is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(indexPosition)}
                    onClick={() => runItem(item)}
                  >
                    <span className="global-search-type">{typeLabels[item.result.type]}</span>
                    <span className="global-search-copy">
                      <strong>{item.result.label}</strong>
                      <small>{item.result.subtitle}</small>
                      <span className="global-search-reasons">{item.result.reasons.slice(0, 3).map((reason) => <em key={reason}>{reason}</em>)}</span>
                    </span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                );
              })}
            </div>

            <footer className="global-search-footer">
              <span>Lokaler Workspace-Index · keine externe Übertragung</span>
              <span>Notizen werden standardmäßig nicht indexiert.</span>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
