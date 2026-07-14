import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState } from '../../types/domain';
import { ContactsPage } from './ContactsPage';

const commands = {
  addContact: vi.fn(),
  updateContact: vi.fn(),
  addFollowUp: vi.fn(),
  completeFollowUp: vi.fn(),
  rescheduleFollowUp: vi.fn(),
  moveContactStage: vi.fn(),
  addProperty: vi.fn(),
  logCall: vi.fn(),
};

let mockStore: AppState & typeof commands;

vi.mock('../../app/AppStore', () => ({
  useAppStore: () => mockStore,
}));

function createStore(): AppState & typeof commands {
  return {
    schemaVersion: 2,
    workspace: { id: 'w-1', name: 'VINCERE', region: 'MKK', createdAt: '2026-01-01T00:00:00.000Z' },
    currentUser: { id: 'u-1', workspaceId: 'w-1', name: 'Kevin', email: 'kevin@example.de', role: 'owner' },
    contacts: [
      { id: 'c-1', firstName: 'Anna', lastName: 'Becker', phone: '', email: 'anna@example.de', city: 'Bruchköbel', source: 'Empfehlung', role: 'Eigentümer', stage: 'qualified', priority: 'high', potential: 90, notes: 'Bewertung gewünscht.', createdAt: '2026-07-01T09:00:00.000Z' },
      { id: 'c-2', firstName: 'Ben', lastName: 'Roth', phone: '+49 160 111111', city: 'Hanau', source: 'Website', role: 'Käufer', stage: 'lead', priority: 'low', potential: 45, nextActionAt: '2099-07-20T09:00:00.000Z', createdAt: '2026-07-10T09:00:00.000Z' },
    ],
    followUps: [],
    properties: [],
    appointments: [],
    callEvents: [],
    auditEvents: [],
    ...commands,
  };
}

describe('ContactsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore = createStore();
  });

  it('renders a sales cockpit and exposes mobile row labels for responsive card mode', () => {
    render(<ContactsPage />);
    expect(screen.getByRole('region', { name: /Kontaktcockpit Anna Becker/i })).toBeInTheDocument();
    const annaRow = screen.getByRole('button', { name: /Anna Becker/i });
    expect(annaRow.querySelector('[data-label="Nächste Aktion"]')).not.toBeNull();
    expect(annaRow.querySelector('[data-label="Eigentümer"]')).not.toBeNull();
    expect(annaRow.querySelector('[data-label="Datenqualität"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: /Telefonnummer fehlt/i })).toBeDisabled();
  });

  it('filters contacts immediately through the search field', () => {
    render(<ContactsPage />);
    fireEvent.change(screen.getByRole('textbox', { name: /Kontakte durchsuchen/i }), { target: { value: 'Hanau' } });
    expect(screen.queryByRole('button', { name: /Anna Becker/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ben Roth/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Kontaktcockpit Ben Roth/i })).toBeInTheDocument();
  });

  it('switches the cockpit when a different contact is selected', () => {
    render(<ContactsPage />);
    fireEvent.click(screen.getByRole('button', { name: /Ben Roth/i }));
    expect(screen.getByRole('region', { name: /Kontaktcockpit Ben Roth/i })).toBeInTheDocument();
    expect(screen.getByText('Keine Immobilie verknüpft')).toBeInTheDocument();
  });
});
