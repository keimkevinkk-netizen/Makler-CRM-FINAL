import { describe, expect, it } from 'vitest';
import type { Appointment, CallEvent, Contact, FollowUp, Property } from '../src/types/domain';
import { buildTerritoryInsights, getUnassignedTerritoryName } from '../src/domain/territories/territoryAnalytics';
import {
  buildCampaignWorkbench,
  buildWeeklyTerritoryPlan,
  filterCampaignRecommendations,
  recommendCampaigns,
} from '../src/domain/campaigns/campaignPlanning';
import { campaignTemplates } from '../src/domain/campaigns/campaignTemplates';

const now = new Date('2026-07-14T09:00:00.000Z');

function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: overrides.id ?? 'contact-1',
    firstName: overrides.firstName ?? 'Max',
    lastName: overrides.lastName ?? 'Beispiel',
    phone: overrides.phone ?? '+49 6000 123456',
    email: overrides.email ?? 'max@example.invalid',
    city: overrides.city ?? 'Bruchköbel',
    source: overrides.source ?? 'Empfehlung',
    role: overrides.role ?? 'Eigentümer',
    stage: overrides.stage ?? 'qualified',
    priority: overrides.priority ?? 'high',
    potential: overrides.potential ?? 80,
    lastContactAt: overrides.lastContactAt,
    nextActionAt: overrides.nextActionAt,
    notes: overrides.notes,
    createdAt: overrides.createdAt ?? '2026-06-01T09:00:00.000Z',
  };
}

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: overrides.id ?? 'property-1',
    title: overrides.title ?? 'Testobjekt',
    address: overrides.address ?? 'Musterstraße 1',
    city: overrides.city ?? 'Bruchköbel',
    type: overrides.type ?? 'Einfamilienhaus',
    status: overrides.status ?? 'Bewertung',
    estimatedValue: overrides.estimatedValue ?? 400_000,
    ownerContactId: overrides.ownerContactId,
  };
}

function build(input: {
  contacts?: Contact[];
  followUps?: FollowUp[];
  properties?: Property[];
  appointments?: Appointment[];
  callEvents?: CallEvent[];
} = {}) {
  return buildTerritoryInsights({
    contacts: input.contacts ?? [],
    followUps: input.followUps ?? [],
    properties: input.properties ?? [],
    appointments: input.appointments ?? [],
    callEvents: input.callEvents ?? [],
    now,
  });
}

describe('territory analytics', () => {
  it('keeps unknown territories and contacts without a city visible', () => {
    const insights = build({
      contacts: [
        contact({ id: 'unknown', city: 'Musterort' }),
        contact({ id: 'unassigned', city: '' }),
      ],
    });

    const unknown = insights.find((territory) => territory.name === 'Musterort');
    const unassigned = insights.find((territory) => territory.name === getUnassignedTerritoryName());

    expect(unknown?.supported).toBe(false);
    expect(unknown?.scoreFactors.find((factor) => factor.key === 'strategy')?.points).toBe(0);
    expect(unassigned?.metrics.contacts).toBe(1);
    expect(unassigned?.supported).toBe(false);
  });

  it('represents empty configured territories without inventing activity or data quality', () => {
    const bruchkoebel = build().find((territory) => territory.name === 'Bruchköbel');

    expect(bruchkoebel?.metrics.contacts).toBe(0);
    expect(bruchkoebel?.metrics.activeProperties).toBe(0);
    expect(bruchkoebel?.metrics.operationalDataQuality).toBe(0);
    expect(bruchkoebel?.scoreFactors.find((factor) => factor.key === 'inactivity')?.points).toBe(0);
  });

  it('detects overdue tasks and gives missing market data zero points', () => {
    const owner = contact({ id: 'owner-hanau', city: 'Hanau' });
    const followUp: FollowUp = {
      id: 'followup-overdue',
      contactId: owner.id,
      title: 'Eigentümer zurückrufen',
      dueAt: '2026-07-13T09:00:00.000Z',
      priority: 'high',
      status: 'open',
      channel: 'phone',
    };
    const hanau = build({ contacts: [owner], followUps: [followUp] })
      .find((territory) => territory.name === 'Hanau');

    expect(hanau?.metrics.overdueFollowUps).toBe(1);
    expect(hanau?.metrics.marketData.quality).toBe('missing');
    expect(hanau?.scoreFactors.find((factor) => factor.key === 'marketData')?.points).toBe(0);
    expect(hanau?.recommendedActions.join(' ')).toContain('Überfällige Follow-ups');
  });

  it('sorts equal territory values deterministically', () => {
    const firstRun = build({
      contacts: [
        contact({ id: 'bruchkoebel', city: 'Bruchköbel', potential: 50 }),
        contact({ id: 'schoeneck', city: 'Schöneck', potential: 50 }),
      ],
    });
    const secondRun = build({
      contacts: [
        contact({ id: 'schoeneck', city: 'Schöneck', potential: 50 }),
        contact({ id: 'bruchkoebel', city: 'Bruchköbel', potential: 50 }),
      ],
    });

    expect(firstRun.map((territory) => territory.name)).toEqual(secondRun.map((territory) => territory.name));
    expect(firstRun.findIndex((territory) => territory.name === 'Bruchköbel'))
      .toBeLessThan(firstRun.findIndex((territory) => territory.name === 'Schöneck'));
  });
});

describe('campaign planning safeguards', () => {
  it('filters eligible campaign templates and blocks market information without market data', () => {
    const owner = contact({ id: 'owner-1', city: 'Bruchköbel' });
    const territory = build({
      contacts: [owner],
      properties: [property({ ownerContactId: owner.id })],
    }).find((item) => item.name === 'Bruchköbel');

    expect(territory).toBeDefined();
    const recommendations = recommendCampaigns(territory!);
    const eligible = filterCampaignRecommendations(recommendations, { eligibility: 'eligible' });
    const neighborhood = eligible.find((item) => item.template.id === 'neighborhood');
    const marketInformation = recommendations.find((item) => item.template.id === 'market-information');
    const phoneOnly = filterCampaignRecommendations(recommendations, { channel: 'Telefon', query: 'Eigentümer' });

    expect(neighborhood?.eligible).toBe(true);
    expect(marketInformation?.eligible).toBe(false);
    expect(marketInformation?.blockers.join(' ')).toContain('Marktdaten fehlen');
    expect(phoneOnly.every((item) => item.template.recommendedChannel === 'Telefon')).toBe(true);
  });

  it('applies exclusion rules without exposing a productive recipient list', () => {
    const contacts = [
      contact({ id: 'eligible', city: 'Hanau' }),
      contact({ id: 'objection', city: 'Hanau', notes: 'Widerspruch: nicht kontaktieren' }),
      contact({ id: 'no-phone', city: 'Hanau', phone: '', email: undefined }),
    ];
    const territory = build({ contacts }).find((item) => item.name === 'Hanau');
    const template = campaignTemplates.find((item) => item.id === 'owner-outreach');

    expect(territory).toBeDefined();
    expect(template).toBeDefined();
    const workbench = buildCampaignWorkbench(territory!, template!, contacts, 'agent');

    expect(workbench.targetCount).toBe(1);
    expect(workbench.excludedCount).toBe(2);
    expect(workbench.sendMode).toBe('disabled');
    expect(workbench.requiresManualApproval).toBe(true);
    expect(Object.keys(workbench)).not.toContain('recipients');
  });

  it('keeps viewer workbenches and weekly plans read-only', () => {
    const owner = contact({ city: 'Nidderau' });
    const territory = build({ contacts: [owner] }).find((item) => item.name === 'Nidderau');
    const template = campaignTemplates.find((item) => item.id === 'owner-outreach');

    expect(territory).toBeDefined();
    expect(template).toBeDefined();
    const workbench = buildCampaignWorkbench(territory!, template!, [owner], 'viewer');
    const recommendation = recommendCampaigns(territory!).find((item) => item.template.id === template!.id);
    const weeklyPlan = buildWeeklyTerritoryPlan(territory!, recommendation, workbench, 'viewer');

    expect(workbench.editable).toBe(false);
    expect(weeklyPlan.editable).toBe(false);
    expect(weeklyPlan.persisted).toBe(false);
    expect(weeklyPlan.entries.every((entry) => entry.targetContacts >= 0)).toBe(true);
  });
});
