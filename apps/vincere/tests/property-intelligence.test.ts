import { describe, expect, it } from 'vitest';
import type { Appointment, Contact, FollowUp, Property } from '../src/types/domain';
import {
  buildPropertyOpportunities,
  buildPropertyOpportunity,
  filterPropertyOpportunities,
  summarizePropertyPortfolio,
} from '../src/features/properties/propertyIntelligence';

const now = new Date('2026-07-14T09:00:00.000Z');

const owner: Contact = {
  id: 'contact-owner',
  firstName: 'Anna',
  lastName: 'Beispiel',
  phone: '+49 6000 123456',
  email: 'anna@example.invalid',
  city: 'Bruchköbel',
  source: 'Empfehlung',
  role: 'Eigentümer',
  stage: 'qualified',
  priority: 'high',
  potential: 90,
  createdAt: '2026-06-01T09:00:00.000Z',
};

const property: Property = {
  id: 'property-1',
  title: 'Einfamilienhaus am Feldrand',
  address: 'Musterstraße 1',
  city: 'Bruchköbel',
  type: 'Einfamilienhaus',
  status: 'Bewertung',
  estimatedValue: 500_000,
  ownerContactId: owner.id,
};

const overdue: FollowUp = {
  id: 'followup-overdue',
  contactId: owner.id,
  title: 'Bewertungstermin abstimmen',
  dueAt: '2026-07-13T09:00:00.000Z',
  priority: 'high',
  status: 'open',
  channel: 'phone',
};

const appointment: Appointment = {
  id: 'appointment-1',
  contactId: owner.id,
  title: 'Bewertung vor Ort',
  subtitle: 'Unterlagen mitbringen',
  startsAt: '2026-07-16T10:00:00.000Z',
  status: 'tomorrow',
};

describe('property opportunity intelligence', () => {
  it('surfaces overdue high-potential valuation cases with transparent factors', () => {
    const result = buildPropertyOpportunity(property, {
      contacts: [owner],
      followUps: [overdue],
      appointments: [appointment],
      now,
    });

    expect(result.owner?.id).toBe(owner.id);
    expect(result.overdueFollowUps).toHaveLength(1);
    expect(result.nextAppointment?.id).toBe(appointment.id);
    expect(result.actionScore).toBeGreaterThanOrEqual(70);
    expect(result.actionFactors.map((factor) => factor.label)).toContain('Überfälliges Follow-up');
    expect(result.recommendedAction).toBe('Überfälliges Eigentümer-Follow-up erledigen');
  });

  it('detects broken owner references instead of silently treating them as valid', () => {
    const result = buildPropertyOpportunity({ ...property, ownerContactId: 'missing-contact' }, {
      contacts: [owner],
      followUps: [],
      appointments: [],
      now,
    });

    expect(result.ownerReferenceBroken).toBe(true);
    expect(result.owner).toBeUndefined();
    expect(result.recommendedAction).toBe('Fehlerhafte Eigentümerverknüpfung prüfen');
    expect(result.risks.join(' ')).toContain('keinen vorhandenen Kontakt');
  });

  it('derives readiness and an explicitly internal range from available data', () => {
    const complete = buildPropertyOpportunity(property, {
      contacts: [owner],
      followUps: [],
      appointments: [],
      now,
    });
    const incomplete = buildPropertyOpportunity({
      ...property,
      id: 'property-2',
      address: '',
      estimatedValue: 0,
      ownerContactId: undefined,
    }, {
      contacts: [owner],
      followUps: [],
      appointments: [],
      now,
    });

    expect(complete.readiness).toBe(100);
    expect(complete.internalRange).toEqual({ min: 465_000, max: 535_000, spread: 0.07 });
    expect(incomplete.readiness).toBeLessThan(complete.readiness);
    expect(incomplete.internalRange).toBeUndefined();
    expect(incomplete.dataGaps).toContain('Arbeitswert fehlt');
  });

  it('filters and sorts deterministically by action value', () => {
    const second: Property = {
      ...property,
      id: 'property-2',
      title: 'Wohnung Innenstadt',
      city: 'Hanau',
      type: 'Eigentumswohnung',
      status: 'Vermarktung',
      estimatedValue: 250_000,
    };
    const items = buildPropertyOpportunities([second, property], {
      contacts: [owner],
      followUps: [overdue],
      appointments: [appointment],
      now,
    });

    const filtered = filterPropertyOpportunities(items, {
      query: 'feldrand',
      status: 'Bewertung',
      type: 'all',
      city: 'Bruchköbel',
      sort: 'action',
    });

    expect(filtered.map((item) => item.property.id)).toEqual([property.id]);
    expect(filterPropertyOpportunities(items, {
      query: '',
      status: 'all',
      type: 'all',
      city: 'all',
      sort: 'value',
    })[0].property.id).toBe(property.id);
  });

  it('summarizes only active values and data gaps', () => {
    const sold: Property = { ...property, id: 'sold', status: 'Verkauft', estimatedValue: 800_000 };
    const withoutOwner: Property = { ...property, id: 'ownerless', ownerContactId: undefined, estimatedValue: 300_000 };
    const items = buildPropertyOpportunities([property, sold, withoutOwner], {
      contacts: [owner],
      followUps: [],
      appointments: [],
      now,
    });

    const summary = summarizePropertyPortfolio(items);

    expect(summary.total).toBe(3);
    expect(summary.active).toBe(2);
    expect(summary.pipelineValue).toBe(800_000);
    expect(summary.withoutOwner).toBe(1);
    expect(summary.withoutNextAction).toBe(2);
  });
});
