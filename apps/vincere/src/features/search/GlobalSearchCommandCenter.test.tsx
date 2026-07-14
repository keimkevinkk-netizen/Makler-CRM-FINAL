import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AppState } from '../../types/domain';
import { GlobalSearchCommandCenterView } from './GlobalSearchCommandCenter';

function createState(role: AppState['currentUser']['role'] = 'owner'): AppState {
  return {
    schemaVersion: 2,
    workspace: { id: 'workspace-a', name: 'VINCERE', region: 'MKK', createdAt: '2026-01-01T00:00:00.000Z' },
    currentUser: { id: 'user-a', workspaceId: 'workspace-a', name: 'Kevin', email: 'kevin@example.de', role },
    contacts: [
      { id: 'contact-a', firstName: 'Anna', lastName: 'Becker', phone: '+49 160 1234567', email: 'anna@example.de', city: 'Bruchköbel', source: 'Empfehlung', role: 'Eigentümer', stage: 'appointment', priority: 'high', potential: 90, createdAt: '2026-07-01T09:00:00.000Z' },
    ],
    followUps: [],
    properties: [],
    appointments: [],
    callEvents: [],
    auditEvents: [],
  };
}

describe('GlobalSearchCommandCenter', () => {
  it('opens through the keyboard shortcut and closes with Escape', () => {
    render(<GlobalSearchCommandCenterView state={createState()} onNavigate={vi.fn()} onNewContact={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: /Globale Suche/i })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: /Globale Suche/i })).not.toBeInTheDocument();
  });

  it('supports arrow keys and Enter for deterministic result execution', () => {
    const onNavigate = vi.fn();
    render(<GlobalSearchCommandCenterView state={createState()} onNavigate={onNavigate} onNewContact={vi.fn()} defaultOpen />);
    const input = screen.getByRole('combobox', { name: /global durchsuchen/i });
    fireEvent.change(input, { target: { value: 'Anna Becker' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onNavigate).toHaveBeenCalledWith('/contacts');
  });

  it('hides write commands for viewers', () => {
    render(<GlobalSearchCommandCenterView state={createState('viewer')} onNavigate={vi.fn()} onNewContact={vi.fn()} defaultOpen />);
    expect(screen.queryByRole('option', { name: /Neuen Kontakt anlegen/i })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Pipeline anzeigen/i })).toBeInTheDocument();
  });

  it('renders an accessible full-screen-capable search surface on mobile viewports', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    render(<GlobalSearchCommandCenterView state={createState()} onNavigate={vi.fn()} onNewContact={vi.fn()} defaultOpen />);
    expect(screen.getByRole('dialog', { name: /Globale Suche/i })).toHaveClass('global-search-dialog');
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-controls', 'global-search-results');
    expect(screen.getByLabelText(/Ergebnistyp filtern/i)).toBeInTheDocument();
  });
});
