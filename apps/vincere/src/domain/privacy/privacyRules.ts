import type {
  AppState,
  AuditEvent,
  Contact,
  UserRole,
} from '../../types/domain';
import type {
  ConsentChannel,
  ConsentRecord,
  ConsentView,
  ContactPrivacyAssessment,
  ContactPrivacyMetadata,
  DataInventoryItem,
  PersonalDataCategory,
  PrivacyAuditEntry,
  PrivacyComplianceReport,
  PrivacyFinding,
  PrivacyRuleConfig,
  SubjectRequestInput,
  SubjectRequestPreview,
  SubjectRequestType,
} from './privacyTypes';

const DAY_MS = 86_400_000;
const consentChannels: ConsentChannel[] = ['email', 'phone', 'messaging', 'marketing'];
const severityOrder = { high: 0, medium: 1, low: 2 } as const;

export const DEFAULT_PRIVACY_RULE_CONFIG: Readonly<PrivacyRuleConfig> = Object.freeze({
  longInactiveDays: 365,
  deletionReviewDays: 730,
  staleNoteDays: 730,
});

const inventory: ReadonlyArray<DataInventoryItem> = [
  {
    category: 'contacts',
    label: 'Kontakte',
    recordSource: 'AppState.contacts',
    fields: ['id', 'firstName', 'lastName', 'role', 'stage', 'priority', 'potential', 'createdAt', 'lastContactAt', 'nextActionAt'],
    purposeStatus: 'partially_mapped',
    exportRelevant: true,
    containsFreeText: false,
    externalProvider: false,
    notes: 'Kontaktdaten bilden die zentrale betroffene Person. Der konkrete Verarbeitungszweck muss separat dokumentiert werden.',
  },
  {
    category: 'phone_numbers',
    label: 'Telefonnummern',
    recordSource: 'AppState.contacts.phone',
    fields: ['contactId', 'phone'],
    purposeStatus: 'requires_mapping',
    exportRelevant: true,
    containsFreeText: false,
    externalProvider: false,
    notes: 'Kontaktpräferenz und Nachweis der Erlaubnis sind im aktuellen Datenmodell noch nicht dauerhaft abbildbar.',
  },
  {
    category: 'email_addresses',
    label: 'E-Mail-Adressen',
    recordSource: 'AppState.contacts.email',
    fields: ['contactId', 'email'],
    purposeStatus: 'requires_mapping',
    exportRelevant: true,
    containsFreeText: false,
    externalProvider: false,
    notes: 'E-Mail-Nutzung und Marketingeinwilligung müssen getrennt bewertet werden.',
  },
  {
    category: 'addresses',
    label: 'Adressen',
    recordSource: 'AppState.contacts.city / AppState.properties.address',
    fields: ['contactId', 'city', 'propertyId', 'address'],
    purposeStatus: 'requires_mapping',
    exportRelevant: true,
    containsFreeText: false,
    externalProvider: false,
    notes: 'Kontaktort und Objektanschrift besitzen unterschiedliche fachliche Kontexte und dürfen nicht gleichgesetzt werden.',
  },
  {
    category: 'conversation_notes',
    label: 'Gesprächsnotizen',
    recordSource: 'AppState.contacts.notes / AppState.callEvents.note',
    fields: ['contactId', 'notes', 'callEventId', 'note', 'createdAt'],
    purposeStatus: 'requires_mapping',
    exportRelevant: true,
    containsFreeText: true,
    externalProvider: false,
    notes: 'Freitext kann unerwartet sensible Angaben enthalten. Protokollierung und spätere Löschprüfung benötigen besondere Aufmerksamkeit.',
  },
  {
    category: 'follow_ups',
    label: 'Follow-ups',
    recordSource: 'AppState.followUps',
    fields: ['id', 'contactId', 'title', 'dueAt', 'priority', 'status', 'channel'],
    purposeStatus: 'partially_mapped',
    exportRelevant: true,
    containsFreeText: true,
    externalProvider: false,
    notes: 'Offene Folgeschritte können gegen eine vorschnelle Löschfreigabe sprechen, ersetzen aber keine rechtliche Prüfung.',
  },
  {
    category: 'appointments',
    label: 'Termine',
    recordSource: 'AppState.appointments',
    fields: ['id', 'contactId', 'title', 'subtitle', 'startsAt', 'status'],
    purposeStatus: 'partially_mapped',
    exportRelevant: true,
    containsFreeText: true,
    externalProvider: false,
    notes: 'Termine werden nur als operativer Kontext bewertet. Daraus wird keine Rechtsgrundlage abgeleitet.',
  },
  {
    category: 'properties',
    label: 'Immobilien',
    recordSource: 'AppState.properties',
    fields: ['id', 'title', 'address', 'city', 'type', 'status', 'estimatedValue', 'ownerContactId'],
    purposeStatus: 'requires_mapping',
    exportRelevant: true,
    containsFreeText: true,
    externalProvider: false,
    notes: 'Objektdaten können über Eigentümerbeziehungen personenbezogen sein. Markt- und Kontaktdaten müssen fachlich getrennt bleiben.',
  },
  {
    category: 'call_events',
    label: 'Telefonereignisse',
    recordSource: 'AppState.callEvents',
    fields: ['id', 'contactId', 'outcome', 'note', 'createdAt'],
    purposeStatus: 'partially_mapped',
    exportRelevant: true,
    containsFreeText: true,
    externalProvider: false,
    notes: 'Telefonereignisse dokumentieren Zugriffe und Kommunikation, nicht automatisch deren rechtliche Zulässigkeit.',
  },
  {
    category: 'audit_data',
    label: 'Auditdaten',
    recordSource: 'AppState.auditEvents',
    fields: ['id', 'actorId', 'workspaceId', 'entity', 'entityId', 'action', 'summary', 'createdAt'],
    purposeStatus: 'partially_mapped',
    exportRelevant: true,
    containsFreeText: true,
    externalProvider: false,
    notes: 'Die Rolle zum Ereigniszeitpunkt fehlt bislang. Aktuelle Rollen dürfen nicht rückwirkend als historische Rollen ausgegeben werden.',
  },
  {
    category: 'external_provider_data',
    label: 'Externe Providerdaten',
    recordSource: 'Noch nicht angebunden',
    fields: ['provider', 'externalId', 'receivedAt', 'sourcePurpose', 'retentionUntil', 'rawPayloadExcluded'],
    purposeStatus: 'requires_mapping',
    exportRelevant: true,
    containsFreeText: false,
    externalProvider: true,
    notes: 'Providerdaten sind nur als zukünftige Inventarkategorie vorbereitet. Es besteht keine produktive Anbindung.',
  },
];

function parseTime(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function wholeDaysBetween(later: number, earlier: number): number {
  return Math.max(0, Math.floor((later - earlier) / DAY_MS));
}

function stableFindingSort(left: PrivacyFinding, right: PrivacyFinding): number {
  return severityOrder[left.severity] - severityOrder[right.severity]
    || left.code.localeCompare(right.code)
    || (left.contactId ?? '').localeCompare(right.contactId ?? '')
    || (left.relatedRecordId ?? '').localeCompare(right.relatedRecordId ?? '');
}

function createFinding(input: Omit<PrivacyFinding, 'id'>): PrivacyFinding {
  const key = [input.code, input.contactId ?? 'workspace', input.relatedRecordId ?? input.category].join(':');
  return { ...input, id: key };
}

function assertWorkspaceScope(state: AppState, workspaceId: string): void {
  if (state.workspace.id !== workspaceId) {
    throw new Error('Workspace-Isolation verletzt: Datenschutzdaten dürfen nicht workspaceübergreifend ausgewertet werden.');
  }
}

function normalizeConsent(channel: ConsentChannel, record?: ConsentRecord): ConsentView {
  const decision = record?.decision ?? 'unknown';
  const evidenceMissing = decision !== 'unknown' && (!record?.source || !record.recordedAt);
  return {
    channel,
    decision,
    recordedAt: record?.recordedAt,
    source: record?.source,
    evidenceReference: record?.evidenceReference,
    evidenceMissing,
  };
}

function latestRelevantActivityAt(state: AppState, contact: Contact): string {
  const timestamps = [
    contact.createdAt,
    contact.lastContactAt,
    ...state.callEvents.filter((event) => event.contactId === contact.id).map((event) => event.createdAt),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ value, time: parseTime(value, Number.NEGATIVE_INFINITY) }))
    .filter((entry) => Number.isFinite(entry.time))
    .sort((left, right) => right.time - left.time || left.value.localeCompare(right.value));

  return timestamps[0]?.value ?? contact.createdAt;
}

function hasActiveOperationalContext(state: AppState, contactId: string, asOfMs: number): boolean {
  const openFollowUp = state.followUps.some((followUp) => followUp.contactId === contactId && followUp.status === 'open');
  const futureAppointment = state.appointments.some((appointment) => (
    appointment.contactId === contactId && parseTime(appointment.startsAt, Number.NEGATIVE_INFINITY) >= asOfMs
  ));
  const activeProperty = state.properties.some((property) => (
    property.ownerContactId === contactId && property.status !== 'Verkauft'
  ));
  return openFollowUp || futureAppointment || activeProperty;
}

function exportRelevantCount(state: AppState, contactId: string): number {
  return 1
    + state.followUps.filter((item) => item.contactId === contactId).length
    + state.appointments.filter((item) => item.contactId === contactId).length
    + state.properties.filter((item) => item.ownerContactId === contactId).length
    + state.callEvents.filter((item) => item.contactId === contactId).length
    + state.auditEvents.filter((item) => item.entityId === contactId).length;
}

function assessContact(
  state: AppState,
  contact: Contact,
  metadata: ContactPrivacyMetadata | undefined,
  asOf: string,
  config: PrivacyRuleConfig,
): ContactPrivacyAssessment {
  const asOfMs = parseTime(asOf, Date.now());
  const lastActivityAt = latestRelevantActivityAt(state, contact);
  const inactiveDays = wholeDaysBetween(asOfMs, parseTime(lastActivityAt, asOfMs));
  const consents = consentChannels.map((channel) => normalizeConsent(channel, metadata?.consents?.[channel]));
  const purposes = metadata?.purposes?.filter((record) => record.purpose !== 'unresolved') ?? [];
  const purposeUnresolved = purposes.length === 0;
  const operationalContext = hasActiveOperationalContext(state, contact.id, asOfMs);
  const findings: PrivacyFinding[] = [];

  if (inactiveDays >= config.longInactiveDays) {
    findings.push(createFinding({
      code: 'long_inactivity',
      severity: 'medium',
      contactId: contact.id,
      category: 'contacts',
      title: 'Kontakt lange inaktiv',
      explanation: `Seit der letzten nachvollziehbaren Aktivität sind ${inactiveDays} volle Tage vergangen. Dies ist ein technischer Prüfhinweis, keine automatische Löschfrist.`,
      legalDecisionRequired: true,
    }));
  }

  if (purposeUnresolved) {
    findings.push(createFinding({
      code: 'purpose_unresolved',
      severity: 'high',
      contactId: contact.id,
      category: 'contacts',
      title: 'Verarbeitungszweck ungeklärt',
      explanation: 'Im technischen Metadatenmodell ist kein dokumentierter Verarbeitungszweck hinterlegt. Eine rechtliche Grundlage wird nicht automatisch unterstellt.',
      legalDecisionRequired: true,
    }));
  }

  if (!metadata?.dataOrigin?.trim() && !contact.source.trim()) {
    findings.push(createFinding({
      code: 'data_origin_missing',
      severity: 'high',
      contactId: contact.id,
      category: 'contacts',
      title: 'Datenherkunft fehlt',
      explanation: 'Weder im Kontakt noch in den vorbereiteten Datenschutzmetadaten ist eine belastbare Herkunft dokumentiert.',
      legalDecisionRequired: true,
    }));
  }

  for (const consent of consents) {
    if (consent.decision === 'unknown') {
      findings.push(createFinding({
        code: 'consent_unknown',
        severity: 'medium',
        contactId: contact.id,
        category: consent.channel === 'email' ? 'email_addresses' : 'phone_numbers',
        title: `${consent.channel}: Einwilligungsstatus unbekannt`,
        explanation: 'Unbekannt bedeutet nicht erlaubt oder verboten. Vor einer einwilligungsabhängigen Nutzung ist eine fachliche Prüfung erforderlich.',
        legalDecisionRequired: true,
      }));
    }
    if (consent.decision === 'withdrawn') {
      findings.push(createFinding({
        code: 'consent_withdrawn',
        severity: 'high',
        contactId: contact.id,
        category: consent.channel === 'email' ? 'email_addresses' : 'phone_numbers',
        title: `${consent.channel}: Einwilligung widerrufen`,
        explanation: 'Der dokumentierte Widerruf muss in nachgelagerten Kommunikations- und Marketingprozessen berücksichtigt werden.',
        legalDecisionRequired: false,
      }));
    }
    if (consent.evidenceMissing) {
      findings.push(createFinding({
        code: 'consent_evidence_missing',
        severity: 'high',
        contactId: contact.id,
        category: consent.channel === 'email' ? 'email_addresses' : 'phone_numbers',
        title: `${consent.channel}: Nachweis unvollständig`,
        explanation: 'Eine Entscheidung ist eingetragen, aber Datum oder Quelle fehlen. Die technische Anzeige darf deshalb keinen belastbaren Nachweis behaupten.',
        legalDecisionRequired: true,
      }));
    }
  }

  if (contact.notes?.trim()) {
    if (!metadata?.notesReviewedAt) {
      findings.push(createFinding({
        code: 'note_review_missing',
        severity: 'low',
        contactId: contact.id,
        category: 'conversation_notes',
        title: 'Prüfdatum der Gesprächsnotiz fehlt',
        explanation: 'Das aktuelle Datenmodell kennt kein separates Erstell- oder Prüfdatum der Kontaktnotiz. Alter und fortbestehende Erforderlichkeit können daher nicht sicher beurteilt werden.',
        legalDecisionRequired: true,
      }));
    } else {
      const noteAge = wholeDaysBetween(asOfMs, parseTime(metadata.notesReviewedAt, asOfMs));
      if (noteAge >= config.staleNoteDays) {
        findings.push(createFinding({
          code: 'stale_notes',
          severity: 'medium',
          contactId: contact.id,
          category: 'conversation_notes',
          title: 'Gesprächsnotiz lange nicht geprüft',
          explanation: `Die letzte dokumentierte Notizprüfung liegt ${noteAge} volle Tage zurück. Inhalt und Erforderlichkeit sollten manuell geprüft werden.`,
          legalDecisionRequired: true,
        }));
      }
    }
  }

  const deletionReviewRequired = inactiveDays >= config.deletionReviewDays
    && purposeUnresolved
    && !operationalContext;

  if (deletionReviewRequired) {
    findings.push(createFinding({
      code: 'deletion_review_required',
      severity: 'high',
      contactId: contact.id,
      category: 'contacts',
      title: 'Löschprüfung erforderlich',
      explanation: 'Lange Inaktivität, ungeklärter Zweck und fehlender aktiver Vorgang ergeben einen Prüfkandidaten. Es wird weder eine Löschpflicht behauptet noch eine Löschung ausgeführt.',
      legalDecisionRequired: true,
    }));
  }

  return {
    contactId: contact.id,
    workspaceId: state.workspace.id,
    inactiveDays,
    lastRelevantActivityAt: lastActivityAt,
    purposes,
    purposeUnresolved,
    consents,
    dataOrigin: metadata?.dataOrigin?.trim() || contact.source.trim() || undefined,
    hasActiveOperationalContext: operationalContext,
    exportRelevantRecordCount: exportRelevantCount(state, contact.id),
    deletionReviewRequired,
    findings: findings.sort(stableFindingSort),
  };
}

function orphanFindings(state: AppState): PrivacyFinding[] {
  const contactIds = new Set(state.contacts.map((contact) => contact.id));
  const findings: PrivacyFinding[] = [];
  const add = (category: PersonalDataCategory, id: string, contactId: string | undefined) => {
    findings.push(createFinding({
      code: 'orphaned_record',
      severity: 'high',
      relatedRecordId: id,
      category,
      title: 'Nicht zuordenbarer Datensatz',
      explanation: `Der Datensatz verweist auf den Kontakt ${contactId || 'ohne Kontakt-ID'}, der im aktuellen Workspace nicht vorhanden ist. Es erfolgt keine automatische Zuordnung.`,
      legalDecisionRequired: true,
    }));
  };

  state.followUps.forEach((item) => { if (!contactIds.has(item.contactId)) add('follow_ups', item.id, item.contactId); });
  state.appointments.forEach((item) => { if (item.contactId && !contactIds.has(item.contactId)) add('appointments', item.id, item.contactId); });
  state.callEvents.forEach((item) => { if (!contactIds.has(item.contactId)) add('call_events', item.id, item.contactId); });
  state.properties.forEach((item) => { if (item.ownerContactId && !contactIds.has(item.ownerContactId)) add('properties', item.id, item.ownerContactId); });

  return findings.sort(stableFindingSort);
}

function actorRoleForEvent(state: AppState, event: AuditEvent, roleDirectory: Readonly<Record<string, UserRole>>): UserRole | 'unknown' {
  if (roleDirectory[event.actorId]) return roleDirectory[event.actorId];
  if (event.actorId === state.currentUser.id) return state.currentUser.role;
  return 'unknown';
}

export function getPrivacyDataInventory(): DataInventoryItem[] {
  return inventory.map((item) => ({ ...item, fields: [...item.fields] }));
}

export function buildPrivacyAuditTrail(
  state: AppState,
  workspaceId: string,
  roleDirectory: Readonly<Record<string, UserRole>> = {},
): PrivacyAuditEntry[] {
  assertWorkspaceScope(state, workspaceId);
  return state.auditEvents
    .filter((event) => event.workspaceId === workspaceId)
    .map((event) => ({
      id: event.id,
      workspaceId: event.workspaceId,
      actorId: event.actorId,
      actorRole: actorRoleForEvent(state, event, roleDirectory),
      entity: event.entity,
      entityId: event.entityId,
      action: event.action,
      summary: event.summary,
      occurredAt: event.createdAt,
    }))
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt) || left.id.localeCompare(right.id));
}

export function buildPrivacyComplianceReport(
  state: AppState,
  metadata: readonly ContactPrivacyMetadata[],
  asOf: string,
  workspaceId = state.workspace.id,
  config: PrivacyRuleConfig = DEFAULT_PRIVACY_RULE_CONFIG,
  roleDirectory: Readonly<Record<string, UserRole>> = {},
): PrivacyComplianceReport {
  assertWorkspaceScope(state, workspaceId);
  const metadataByContact = new Map<string, ContactPrivacyMetadata>();
  for (const item of metadata) {
    if (item.workspaceId !== workspaceId) {
      throw new Error('Workspace-Isolation verletzt: Datenschutzmetadaten gehören zu einem anderen Workspace.');
    }
    if (metadataByContact.has(item.contactId)) {
      throw new Error(`Doppelte Datenschutzmetadaten für Kontakt ${item.contactId}.`);
    }
    metadataByContact.set(item.contactId, item);
  }

  const contacts = state.contacts
    .map((contact) => assessContact(state, contact, metadataByContact.get(contact.id), asOf, config))
    .sort((left, right) => left.contactId.localeCompare(right.contactId));
  const orphans = orphanFindings(state);
  const findings = contacts.flatMap((contact) => contact.findings).concat(orphans).sort(stableFindingSort);

  return {
    workspaceId,
    generatedAt: asOf,
    inventory: getPrivacyDataInventory(),
    contacts,
    findings,
    auditTrail: buildPrivacyAuditTrail(state, workspaceId, roleDirectory),
    summary: {
      contactsReviewed: contacts.length,
      highFindings: findings.filter((finding) => finding.severity === 'high').length,
      mediumFindings: findings.filter((finding) => finding.severity === 'medium').length,
      unknownConsentContacts: contacts.filter((contact) => contact.consents.some((consent) => consent.decision === 'unknown')).length,
      withdrawnConsentContacts: contacts.filter((contact) => contact.consents.some((consent) => consent.decision === 'withdrawn')).length,
      deletionReviewCandidates: contacts.filter((contact) => contact.deletionReviewRequired).length,
      orphanedRecords: orphans.length,
    },
  };
}

function canPrepareSubjectRequest(role: UserRole, requestType: SubjectRequestType): { allowed: boolean; reason?: string } {
  if (role === 'viewer') {
    return { allowed: false, reason: 'Lesezugriff darf keine Betroffenenanfrage vorbereiten.' };
  }
  if ((requestType === 'export' || requestType === 'erasure') && role === 'agent') {
    return { allowed: false, reason: 'Export- und Löschvorschauen sind technisch auf Owner und Administratoren begrenzt.' };
  }
  return { allowed: true };
}

function requestRecordGroups(state: AppState, contactId: string): SubjectRequestPreview['recordGroups'] {
  const contact = state.contacts.find((item) => item.id === contactId);
  return [
    { category: 'contacts', recordCount: contact ? 1 : 0, fields: ['id', 'firstName', 'lastName', 'role', 'stage', 'priority', 'potential', 'createdAt', 'lastContactAt', 'nextActionAt'] },
    { category: 'phone_numbers', recordCount: contact?.phone ? 1 : 0, fields: ['contactId', 'phone'] },
    { category: 'email_addresses', recordCount: contact?.email ? 1 : 0, fields: ['contactId', 'email'] },
    { category: 'addresses', recordCount: (contact?.city ? 1 : 0) + state.properties.filter((item) => item.ownerContactId === contactId).length, fields: ['city', 'property.address', 'property.city'] },
    { category: 'conversation_notes', recordCount: (contact?.notes ? 1 : 0) + state.callEvents.filter((item) => item.contactId === contactId && item.note).length, fields: ['contact.notes', 'callEvent.note'] },
    { category: 'follow_ups', recordCount: state.followUps.filter((item) => item.contactId === contactId).length, fields: ['id', 'title', 'dueAt', 'priority', 'status', 'channel'] },
    { category: 'appointments', recordCount: state.appointments.filter((item) => item.contactId === contactId).length, fields: ['id', 'title', 'subtitle', 'startsAt', 'status'] },
    { category: 'properties', recordCount: state.properties.filter((item) => item.ownerContactId === contactId).length, fields: ['id', 'title', 'address', 'city', 'type', 'status', 'estimatedValue'] },
    { category: 'call_events', recordCount: state.callEvents.filter((item) => item.contactId === contactId).length, fields: ['id', 'outcome', 'note', 'createdAt'] },
    { category: 'audit_data', recordCount: state.auditEvents.filter((item) => item.entityId === contactId).length, fields: ['id', 'actorId', 'entity', 'action', 'summary', 'createdAt'] },
    { category: 'external_provider_data', recordCount: 0, fields: ['Keine produktive Provideranbindung vorhanden'] },
  ];
}

function requestBlockers(
  state: AppState,
  metadata: ContactPrivacyMetadata | undefined,
  contactId: string,
  requestType: SubjectRequestType,
  asOf: string,
): string[] {
  if (requestType !== 'erasure' && requestType !== 'restriction') return [];
  const asOfMs = parseTime(asOf, Date.now());
  const blockers: string[] = [];
  if (state.followUps.some((item) => item.contactId === contactId && item.status === 'open')) {
    blockers.push('Offene Follow-ups müssen fachlich bewertet werden.');
  }
  if (state.appointments.some((item) => item.contactId === contactId && parseTime(item.startsAt, 0) >= asOfMs)) {
    blockers.push('Künftige Termine sind mit der Anfrage abzugleichen.');
  }
  if (state.properties.some((item) => item.ownerContactId === contactId && item.status !== 'Verkauft')) {
    blockers.push('Aktive Objektbeziehungen erfordern eine getrennte fachliche und rechtliche Prüfung.');
  }
  if (metadata?.purposes?.some((purpose) => purpose.purpose === 'legal_obligation')) {
    blockers.push('Eine dokumentierte Kategorie „gesetzliche Pflicht“ ist vorhanden; Umfang und Frist müssen juristisch geprüft werden.');
  }
  return blockers.sort((left, right) => left.localeCompare(right));
}

export function prepareSubjectRequestPreview(
  state: AppState,
  metadata: readonly ContactPrivacyMetadata[],
  input: SubjectRequestInput,
  asOf: string,
): SubjectRequestPreview {
  assertWorkspaceScope(state, input.workspaceId);
  const contact = state.contacts.find((item) => item.id === input.contactId);
  if (!contact) throw new Error('Kontakt für Betroffenenanfrage nicht gefunden.');
  const matchingMetadata = metadata.find((item) => item.contactId === input.contactId);
  if (matchingMetadata && matchingMetadata.workspaceId !== input.workspaceId) {
    throw new Error('Workspace-Isolation verletzt: Kontaktmetadaten gehören zu einem anderen Workspace.');
  }
  const permission = canPrepareSubjectRequest(input.actorRole, input.requestType);

  return {
    workspaceId: input.workspaceId,
    contactId: input.contactId,
    requestType: input.requestType,
    generatedAt: asOf,
    status: 'preview_only',
    canPrepare: permission.allowed,
    permissionReason: permission.reason,
    recordGroups: requestRecordGroups(state, input.contactId),
    blockers: requestBlockers(state, matchingMetadata, input.contactId, input.requestType, asOf),
    recommendedSteps: [
      'Identität und Zuständigkeit außerhalb dieser Vorschau verifizieren.',
      'Datenkategorien und Quellen auf Vollständigkeit prüfen.',
      'Rechtliche Entscheidung und Fristen durch eine zuständige Person dokumentieren.',
      'Freigabe, tatsächliche Ausführung und Zustellung in einem getrennten, auditierten Prozess vornehmen.',
    ],
    requiresLegalDecision: true,
    payloadProduced: false,
    deletionExecuted: false,
  };
}
