import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CommunicationHubPage } from '../src/features/communications/CommunicationHubPage';
import {
  COMMUNICATION_DRAFT_TEMPLATES,
  createLocalCommunicationDraft,
} from '../src/features/communications/drafts';

describe('communication hub view', () => {
  it('renders every required operational section', () => {
    render(<CommunicationHubPage role="viewer" />);

    expect(screen.getByRole('heading', { name: /Alle Kommunikationssignale/i })).toBeInTheDocument();
    expect(screen.getByText('Offene Kommunikation')).toBeInTheDocument();
    expect(screen.getByText('Heutige Termine')).toBeInTheDocument();
    expect(screen.getByText('Kontakte mit ausstehender Antwort')).toBeInTheDocument();
    expect(screen.getByText('Nicht eindeutig zuordenbar')).toBeInTheDocument();
    expect(screen.getByText('Provider- und Synchronisationsstatus')).toBeInTheDocument();
    expect(screen.getByText('Gemeinsame Kommunikationshistorie')).toBeInTheDocument();
  });

  it('gives viewers no send action and no editable template control', () => {
    render(<CommunicationHubPage role="viewer" />);

    expect(screen.queryByRole('button', { name: /senden|versenden|abschicken/i })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Vorlage' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Vorschau erzeugen/i })).toBeDisabled();
    expect(screen.getByText(/Versand technisch gesperrt/i)).toBeInTheDocument();
  });

  it('keeps all required templates as local non-sendable previews', () => {
    expect(COMMUNICATION_DRAFT_TEMPLATES.map((template) => template.id)).toEqual([
      'appointment_confirmation',
      'follow_up',
      'callback_request',
      'valuation_message',
      'check_in',
      'referral_request',
      'cancellation',
      'reschedule',
    ]);

    for (const template of COMMUNICATION_DRAFT_TEMPLATES) {
      const draft = createLocalCommunicationDraft(template.id, {}, new Date('2026-07-14T08:00:00.000Z'));
      expect(draft.status).toBe('local_preview');
      expect(draft.sendAllowed).toBe(false);
      expect(draft.storage).toBe('memory_only');
    }
  });
});
