import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MobileNavigation } from '../src/features/mobile/MobileNavigation';

function renderNavigation(entry = '/today') {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <MobileNavigation onOpenQuickActions={vi.fn()} version="test" />
    </MemoryRouter>,
  );
}

describe('mobile navigation', () => {
  it('renders the six required reachable navigation entries', () => {
    renderNavigation();

    const navigation = screen.getByRole('navigation', { name: 'Mobile Hauptnavigation' });
    expect(navigation).toHaveTextContent('Heute');
    expect(navigation).toHaveTextContent('Kontakte');
    expect(navigation).toHaveTextContent('Anruf');
    expect(navigation).toHaveTextContent('Termine');
    expect(navigation).toHaveTextContent('Immobilien');
    expect(navigation).toHaveTextContent('Mehr');
  });

  it('distinguishes appointment mode from the normal today view', () => {
    renderNavigation('/today?mobile=appointments');

    expect(screen.getByText('Termine').closest('a')).toHaveClass('active');
    expect(screen.getByText('Heute').closest('a')).not.toHaveClass('active');
  });

  it('opens secondary routes without adding central router definitions', () => {
    renderNavigation();

    fireEvent.click(screen.getByRole('button', { name: 'Mehr' }));

    expect(screen.getByRole('dialog', { name: 'Weitere Bereiche' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pipeline/ })).toHaveAttribute('href', '/pipeline');
    expect(screen.getByRole('link', { name: /Einstellungen/ })).toHaveAttribute('href', '/settings');
  });
});
