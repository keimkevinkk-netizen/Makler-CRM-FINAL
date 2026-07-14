import type { Contact, UserRole } from '../../types/domain';
import type { TerritoryInsight } from '../territories/territoryTypes';
import { campaignTemplates } from './campaignTemplates';
import {
  canEditCampaignWorkbench,
  type CampaignRecommendation,
  type CampaignRecommendationFilter,
  type CampaignTemplate,
  type CampaignType,
  type CampaignWorkbench,
  type WeeklyTerritoryPlan,
} from './campaignTypes';

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function signalForTemplate(type: CampaignType, territory: TerritoryInsight) {
  const metrics = territory.metrics;
  switch (type) {
    case 'owner-outreach': return metrics.ownerContactsWithoutNextAction + metrics.overdueFollowUps;
    case 'referral': return metrics.networkContacts + metrics.soldContacts;
    case 'neighborhood': return metrics.activeProperties;
    case 'valuation': return metrics.valuationOpportunities;
    case 'reactivation': return metrics.contactsWithoutNextAction + ((metrics.daysSinceActivity ?? 0) >= 30 ? 1 : 0);
    case 'network': return metrics.networkContacts;
    case 'market-information': return metrics.marketData.quality === 'missing' ? 0 : metrics.contacts;
    case 'existing-customer': return metrics.soldContacts;
  }
}

function blockersForTemplate(type: CampaignType, territory: TerritoryInsight) {
  const metrics = territory.metrics;
  const blockers: string[] = [];
  if (type === 'owner-outreach' && metrics.ownerContacts === 0) blockers.push('Keine Eigentümerkontakte im Gebiet vorhanden.');
  if (type === 'referral' && metrics.networkContacts + metrics.soldContacts === 0) blockers.push('Keine belastbaren Empfehlungs- oder Bestandskontakte ableitbar.');
  if (type === 'neighborhood' && metrics.activeProperties === 0) blockers.push('Keine aktive Immobilie als lokaler Anlass vorhanden.');
  if (type === 'valuation' && metrics.valuationOpportunities === 0) blockers.push('Keine dokumentierte Bewertungschance vorhanden.');
  if (type === 'reactivation' && metrics.contactsWithoutNextAction === 0 && (metrics.daysSinceActivity ?? 0) < 30) blockers.push('Keine erkennbare Reaktivierungsgruppe vorhanden.');
  if (type === 'network' && metrics.networkContacts === 0) blockers.push('Keine Netzwerk- oder Tippgeberkontakte vorhanden.');
  if (type === 'market-information' && metrics.marketData.quality === 'missing') blockers.push('Marktdaten fehlen oder sind nicht verifiziert.');
  if (type === 'existing-customer' && metrics.soldContacts === 0) blockers.push('Keine abgeschlossenen Kontaktbeziehungen im Gebiet vorhanden.');
  if (territory.metrics.operationalDataQuality < 40 && territory.metrics.contacts > 0) blockers.push('Operative Datenqualität liegt unter 40 Prozent.');
  return blockers;
}

export function recommendCampaigns(territory: TerritoryInsight): CampaignRecommendation[] {
  return campaignTemplates.map((template) => {
    const signal = signalForTemplate(template.id, territory);
    const blockers = blockersForTemplate(template.id, territory);
    const segmentFit = template.recommendedSegments.includes(territory.segment) ? 30 : 10;
    const signalScore = Math.min(50, signal * 10);
    const qualityScore = Math.round(territory.metrics.operationalDataQuality * 0.2);
    const fitScore = clamp(segmentFit + signalScore + qualityScore - blockers.length * 25);
    const reasons = [
      `${territory.segment} liefert ${segmentFit} Punkte aus der konfigurierten Vorlagenpassung.`,
      `${signal} vorhandene operative Signale ergeben ${signalScore} Punkte.`,
      `${territory.metrics.operationalDataQuality}% operative Datenqualität ergeben ${qualityScore} Punkte.`,
    ];
    return {
      template,
      fitScore,
      eligible: blockers.length === 0,
      reasons,
      blockers,
    };
  }).sort((left, right) => (
    Number(right.eligible) - Number(left.eligible)
    || right.fitScore - left.fitScore
    || left.template.name.localeCompare(right.template.name, 'de')
  ));
}

export function filterCampaignRecommendations(
  recommendations: CampaignRecommendation[],
  filter: CampaignRecommendationFilter,
) {
  const query = filter.query?.trim().toLocaleLowerCase('de') ?? '';
  return recommendations.filter((recommendation) => {
    const eligibilityMatches = !filter.eligibility
      || filter.eligibility === 'all'
      || (filter.eligibility === 'eligible' && recommendation.eligible)
      || (filter.eligibility === 'blocked' && !recommendation.eligible);
    const channelMatches = !filter.channel
      || filter.channel === 'all'
      || recommendation.template.recommendedChannel === filter.channel;
    const queryMatches = !query
      || recommendation.template.name.toLocaleLowerCase('de').includes(query)
      || recommendation.template.targetGroup.toLocaleLowerCase('de').includes(query)
      || recommendation.template.objective.toLocaleLowerCase('de').includes(query);
    return eligibilityMatches && channelMatches && queryMatches;
  });
}

function contactMatchesTemplate(contact: Contact, type: CampaignType) {
  switch (type) {
    case 'owner-outreach': return contact.role === 'Eigentümer' && contact.stage !== 'sold';
    case 'referral': return contact.role === 'Tippgeber' || contact.role === 'Netzwerk' || contact.stage === 'sold';
    case 'neighborhood': return contact.stage !== 'sold';
    case 'valuation': return contact.role === 'Eigentümer' && (contact.stage === 'qualified' || contact.stage === 'appointment');
    case 'reactivation': return contact.stage !== 'sold' && !contact.nextActionAt;
    case 'network': return contact.role === 'Tippgeber' || contact.role === 'Netzwerk';
    case 'market-information': return contact.stage !== 'sold';
    case 'existing-customer': return contact.stage === 'sold';
  }
}

function hasExplicitContactObjection(contact: Contact) {
  const notes = contact.notes?.toLocaleLowerCase('de') ?? '';
  return ['nicht kontaktieren', 'keine werbung', 'widerspruch', 'kontaktverbot'].some((term) => notes.includes(term));
}

function hasUsableChannel(contact: Contact, template: CampaignTemplate) {
  if (template.recommendedChannel === 'E-Mail einzeln') return Boolean(contact.email?.trim());
  if (template.recommendedChannel === 'Telefon') return Boolean(contact.phone.trim());
  if (template.recommendedChannel === 'Brief') return Boolean(contact.city.trim());
  return Boolean(contact.phone.trim() || contact.email?.trim());
}

export function buildCampaignWorkbench(
  territory: TerritoryInsight,
  template: CampaignTemplate,
  contacts: Contact[],
  role: UserRole,
): CampaignWorkbench {
  const territoryContacts = contacts.filter((contact) => (contact.city.trim() || 'Nicht zugeordnet') === territory.name);
  const candidates = territoryContacts.filter((contact) => contactMatchesTemplate(contact, template.id));
  const eligibleContacts = candidates.filter((contact) => (
    !hasExplicitContactObjection(contact) && hasUsableChannel(contact, template)
  ));
  const recommendation = recommendCampaigns(territory).find((item) => item.template.id === template.id);
  const dynamicRisks = recommendation?.blockers ?? [];

  return {
    territory,
    template,
    targetCount: eligibleContacts.length,
    excludedCount: candidates.length - eligibleContacts.length,
    dataQuality: territory.metrics.operationalDataQuality,
    recommendedChannel: template.recommendedChannel,
    tasks: [...template.tasks],
    durationDays: template.durationDays,
    successCriteria: [...template.successCriteria],
    exclusionCriteria: [...template.exclusionCriteria],
    risks: [...dynamicRisks, ...template.risks],
    legalNotes: [...template.legalNotes],
    sendMode: 'disabled',
    requiresManualApproval: true,
    editable: canEditCampaignWorkbench(role),
  };
}

export function buildWeeklyTerritoryPlan(
  focusTerritory: TerritoryInsight,
  campaign: CampaignRecommendation | undefined,
  workbench: CampaignWorkbench | undefined,
  role: UserRole,
): WeeklyTerritoryPlan {
  const targetContacts = Math.min(10, workbench?.targetCount ?? 0);
  const followUps = focusTerritory.metrics.openFollowUps;
  const networkAppointments = Math.min(2, focusTerritory.metrics.networkContacts);
  const campaignTasks = campaign?.template.tasks ?? ['Datenlage prüfen', 'Nächste sinnvolle Aktion festlegen'];

  return {
    focusTerritory,
    campaign,
    persisted: false,
    editable: canEditCampaignWorkbench(role),
    generatedFrom: [
      'Aktuelle Kontakte, Rollen und Pipeline-Stufen',
      'Offene und überfällige Follow-ups',
      'Vorhandene Immobilien und Termine',
      'Konfigurierte strategische Gebietskategorie',
      'Übergebene Marktdatenqualität ohne Ersatzannahmen',
    ],
    entries: [
      {
        day: 'Montag',
        territory: focusTerritory.name,
        activity: 'Daten- und Prioritätsprüfung',
        targetContacts: 0,
        followUps: Math.min(followUps, 3),
        networkAppointments: 0,
        campaignTasks: campaignTasks.slice(0, 2),
        review: 'Kontakte ohne nächste Aktion und Ausschlüsse validieren.',
      },
      {
        day: 'Dienstag',
        territory: focusTerritory.name,
        activity: campaign ? `${campaign.template.name}: erster Kontaktblock` : 'Qualifizierter Einzelkontaktblock',
        targetContacts: Math.ceil(targetContacts / 2),
        followUps: Math.min(Math.max(followUps - 3, 0), 3),
        networkAppointments: 0,
        campaignTasks: campaignTasks.slice(1, 3),
        review: 'Ergebnisse und nächste Aktionen unmittelbar dokumentieren.',
      },
      {
        day: 'Mittwoch',
        territory: focusTerritory.name,
        activity: 'Lokale Netzwerkpflege',
        targetContacts: 0,
        followUps: 0,
        networkAppointments,
        campaignTasks: campaignTasks.slice(2, 4),
        review: 'Lokale Hinweise, Empfehlungen und offene Zusagen sichern.',
      },
      {
        day: 'Donnerstag',
        territory: focusTerritory.name,
        activity: campaign ? `${campaign.template.name}: zweiter Kontaktblock` : 'Nachfass- und Qualifizierungsblock',
        targetContacts: Math.floor(targetContacts / 2),
        followUps: Math.max(followUps - 6, 0),
        networkAppointments: 0,
        campaignTasks: campaignTasks.slice(0, 3),
        review: 'Nicht erreichte Kontakte nur mit begründetem Folgeschritt einplanen.',
      },
      {
        day: 'Freitag',
        territory: focusTerritory.name,
        activity: 'Nachbereitung und Datenqualität',
        targetContacts: 0,
        followUps: 0,
        networkAppointments: 0,
        campaignTasks: ['Erfolgskriterien prüfen', 'Datenlücken schließen', 'Offene nächste Aktionen terminieren'],
        review: 'Gebietswert anhand neuer Daten neu berechnen.',
      },
      {
        day: 'Wochenende',
        territory: focusTerritory.name,
        activity: 'Wochenreview ohne Versand- oder Kontaktaktion',
        targetContacts: 0,
        followUps: 0,
        networkAppointments: 0,
        campaignTasks: ['Ergebnisse gegen Erfolgskriterien prüfen', 'Risiken und Ausschlüsse aktualisieren'],
        review: 'Entscheiden, ob das Gebiet nächste Woche Schwerpunkt bleibt.',
      },
    ],
  };
}
