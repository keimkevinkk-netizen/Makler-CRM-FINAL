import type {
  EscalationStage,
  NotificationCandidate,
  NotificationEngineThresholds,
  NotificationPriority,
  NotificationSourceSnapshot,
} from './types';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

type DeadlineStage = Exclude<EscalationStage, 'snoozed' | 'completed'>;

export const DEFAULT_NOTIFICATION_THRESHOLDS: NotificationEngineThresholds = {
  followUpUpcomingMinutes: 24 * 60,
  appointmentUpcomingMinutes: 2 * 60,
  appointmentPreparationMinutes: 24 * 60,
  contactResponseHours: 48,
  conflictCriticalHours: 24,
  syncCriticalMinutes: 60,
  maxActivePerContact: 3,
};

function parseDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function iso(value: number): string {
  return new Date(value).toISOString();
}

function stageForDeadline(dueAt: number, now: number, upcomingWindowMinutes: number): DeadlineStage | null {
  const delta = dueAt - now;
  if (delta > upcomingWindowMinutes * MINUTE_MS) return null;
  if (delta > 0) return 'upcoming';
  if (delta > -HOUR_MS) return 'due';
  if (delta > -DAY_MS) return 'overdue';
  return 'critical';
}

function priorityForStage(stage: EscalationStage): NotificationPriority {
  switch (stage) {
    case 'critical':
      return 'critical';
    case 'overdue':
    case 'due':
      return 'high';
    case 'upcoming':
      return 'normal';
    case 'snoozed':
    case 'completed':
      return 'low';
  }
}

function invalidDateCandidate(params: {
  entityType: NotificationCandidate['record']['entityType'];
  entityId: string;
  label: string;
  fieldName: string;
  value: string;
  sourceModule: string;
  contactId?: string;
  propertyId?: string;
}): NotificationCandidate {
  return {
    type: 'warning',
    priority: 'high',
    record: {
      entityType: params.entityType,
      entityId: params.entityId,
      label: params.label,
      contactId: params.contactId,
      propertyId: params.propertyId,
    },
    reason: `Das Feld „${params.fieldName}“ enthält keinen gültigen Zeitpunkt: ${params.value}`,
    recommendedAction: 'Zeitangabe prüfen und korrigieren',
    deduplicationKey: `${params.entityType}:${params.entityId}:invalid-${params.fieldName}`,
    stateFingerprint: `invalid:${params.value}`,
    escalation: { stage: 'critical', reason: 'Ungültige Fälligkeit verhindert eine sichere Priorisierung.' },
    metadata: { sourceModule: params.sourceModule },
  };
}

function collectFollowUpCandidates(
  snapshot: NotificationSourceSnapshot,
  now: number,
  thresholds: NotificationEngineThresholds,
): NotificationCandidate[] {
  return (snapshot.followUps ?? []).flatMap((followUp): NotificationCandidate[] => {
    if (followUp.completed || followUp.dueAt === null) return [];
    const dueAt = parseDate(followUp.dueAt);
    if (dueAt === null) {
      return [
        invalidDateCandidate({
          entityType: 'follow_up',
          entityId: followUp.id,
          label: followUp.contactLabel,
          fieldName: 'dueAt',
          value: followUp.dueAt,
          sourceModule: 'followups',
          contactId: followUp.contactId,
        }),
      ];
    }

    const stage = stageForDeadline(dueAt, now, thresholds.followUpUpcomingMinutes);
    if (stage === null) return [];
    const reasonByStage: Record<DeadlineStage, string> = {
      upcoming: 'Follow-up wird bald fällig.',
      due: 'Follow-up ist jetzt fällig.',
      overdue: 'Follow-up ist überfällig.',
      critical: 'Follow-up ist seit mehr als 24 Stunden überfällig.',
    };

    return [
      {
        type: 'follow_up',
        priority: priorityForStage(stage),
        record: {
          entityType: 'follow_up',
          entityId: followUp.id,
          label: followUp.contactLabel,
          contactId: followUp.contactId,
        },
        reason: reasonByStage[stage],
        dueAt: iso(dueAt),
        recommendedAction: followUp.recommendedAction ?? `Kontakt zu ${followUp.contactLabel} aufnehmen`,
        deduplicationKey: `follow_up:${followUp.id}:deadline`,
        stateFingerprint: `${stage}:${iso(dueAt)}:${followUp.recommendedAction ?? ''}`,
        escalation: { stage },
        metadata: {
          sourceModule: 'followups',
          coordinationKey: `contact:${followUp.contactId}:outreach:${Math.floor(dueAt / HOUR_MS)}`,
        },
      },
    ];
  });
}

function collectAppointmentCandidates(
  snapshot: NotificationSourceSnapshot,
  now: number,
  thresholds: NotificationEngineThresholds,
): NotificationCandidate[] {
  return (snapshot.appointments ?? []).flatMap((appointment): NotificationCandidate[] => {
    if (appointment.completed) return [];
    const startsAt = parseDate(appointment.startsAt);
    if (startsAt === null) {
      return [
        invalidDateCandidate({
          entityType: 'appointment',
          entityId: appointment.id,
          label: appointment.title,
          fieldName: 'startsAt',
          value: appointment.startsAt,
          sourceModule: 'appointments',
          contactId: appointment.contactId,
          propertyId: appointment.propertyId,
        }),
      ];
    }

    const candidates: NotificationCandidate[] = [];
    const appointmentStage = stageForDeadline(startsAt, now, thresholds.appointmentUpcomingMinutes);
    if (appointmentStage !== null) {
      candidates.push({
        type: 'appointment',
        priority: priorityForStage(appointmentStage),
        record: {
          entityType: 'appointment',
          entityId: appointment.id,
          label: appointment.title,
          contactId: appointment.contactId,
          propertyId: appointment.propertyId,
        },
        reason:
          appointmentStage === 'upcoming'
            ? 'Termin steht bevor.'
            : appointmentStage === 'due'
              ? 'Termin beginnt jetzt oder hat gerade begonnen.'
              : 'Terminzeitpunkt wurde überschritten; Status prüfen.',
        dueAt: iso(startsAt),
        recommendedAction: `Termin „${appointment.title}“ öffnen`,
        deduplicationKey: `appointment:${appointment.id}:start`,
        stateFingerprint: `${appointmentStage}:${iso(startsAt)}`,
        escalation: { stage: appointmentStage },
        metadata: {
          sourceModule: 'appointments',
          coordinationKey: appointment.contactId
            ? `contact:${appointment.contactId}:appointment:${Math.floor(startsAt / HOUR_MS)}`
            : undefined,
        },
      });
    }

    const preparationDelta = startsAt - now;
    if (
      !appointment.preparationComplete &&
      preparationDelta <= thresholds.appointmentPreparationMinutes * MINUTE_MS
    ) {
      const stage = preparationDelta > 0 ? 'upcoming' : preparationDelta > -HOUR_MS ? 'due' : 'overdue';
      candidates.push({
        type: 'warning',
        priority: stage === 'upcoming' ? 'high' : 'critical',
        record: {
          entityType: 'appointment',
          entityId: appointment.id,
          label: appointment.title,
          contactId: appointment.contactId,
          propertyId: appointment.propertyId,
        },
        reason: 'Termin benötigt Vorbereitung.',
        dueAt: iso(startsAt),
        recommendedAction: 'Terminvorbereitung und fehlende Unterlagen prüfen',
        deduplicationKey: `appointment:${appointment.id}:preparation`,
        stateFingerprint: `${stage}:${iso(startsAt)}:incomplete`,
        escalation: { stage, reason: 'Vorbereitung ist nicht als abgeschlossen markiert.' },
        metadata: {
          sourceModule: 'appointments',
          coordinationKey: `appointment:${appointment.id}:preparation`,
        },
      });
    }

    return candidates;
  });
}

function collectContactCandidates(
  snapshot: NotificationSourceSnapshot,
  now: number,
  thresholds: NotificationEngineThresholds,
): NotificationCandidate[] {
  return (snapshot.contacts ?? []).flatMap((contact): NotificationCandidate[] => {
    if (contact.archived || contact.awaitingResponseSince === null) return [];
    const waitingSince = parseDate(contact.awaitingResponseSince);
    if (waitingSince === null) {
      return [
        invalidDateCandidate({
          entityType: 'contact',
          entityId: contact.id,
          label: contact.displayName,
          fieldName: 'awaitingResponseSince',
          value: contact.awaitingResponseSince,
          sourceModule: 'contacts',
          contactId: contact.id,
        }),
      ];
    }

    let dueAt = waitingSince + thresholds.contactResponseHours * HOUR_MS;
    if (contact.responseDueAt) {
      const parsedResponseDueAt = parseDate(contact.responseDueAt);
      if (parsedResponseDueAt === null) {
        return [
          invalidDateCandidate({
            entityType: 'contact',
            entityId: contact.id,
            label: contact.displayName,
            fieldName: 'responseDueAt',
            value: contact.responseDueAt,
            sourceModule: 'contacts',
            contactId: contact.id,
          }),
        ];
      }
      dueAt = parsedResponseDueAt;
    }

    const stage = stageForDeadline(dueAt, now, thresholds.followUpUpcomingMinutes);
    if (stage === null) return [];
    return [
      {
        type: 'reminder',
        priority: priorityForStage(stage),
        record: {
          entityType: 'contact',
          entityId: contact.id,
          label: contact.displayName,
          contactId: contact.id,
        },
        reason: 'Kontakt wartet auf Rückmeldung.',
        dueAt: iso(dueAt),
        recommendedAction: `Rückmeldung an ${contact.displayName} senden`,
        deduplicationKey: `contact:${contact.id}:awaiting-response`,
        stateFingerprint: `${stage}:${iso(waitingSince)}:${iso(dueAt)}`,
        escalation: { stage },
        metadata: {
          sourceModule: 'contacts',
          coordinationKey: `contact:${contact.id}:outreach:${Math.floor(dueAt / HOUR_MS)}`,
        },
      },
    ];
  });
}

function collectPropertyCandidates(snapshot: NotificationSourceSnapshot, now: number): NotificationCandidate[] {
  return (snapshot.properties ?? []).flatMap((property): NotificationCandidate[] => {
    if (!property.active) return [];
    if (property.nextActionAt === null) {
      return [
        {
          type: 'sales_opportunity',
          priority: 'high',
          record: {
            entityType: 'property',
            entityId: property.id,
            label: property.title,
            contactId: property.contactId,
            propertyId: property.id,
          },
          reason: 'Aktives Objekt besitzt keine nächste Aktion.',
          dueAt: iso(now),
          recommendedAction: 'Nächste vertriebliche Aktion festlegen',
          deduplicationKey: `property:${property.id}:missing-next-action`,
          stateFingerprint: `missing:${property.nextActionLabel ?? ''}`,
          escalation: { stage: 'due' },
          metadata: { sourceModule: 'properties' },
        },
      ];
    }

    const nextActionAt = parseDate(property.nextActionAt);
    if (nextActionAt === null) {
      return [
        invalidDateCandidate({
          entityType: 'property',
          entityId: property.id,
          label: property.title,
          fieldName: 'nextActionAt',
          value: property.nextActionAt,
          sourceModule: 'properties',
          contactId: property.contactId,
          propertyId: property.id,
        }),
      ];
    }
    return [];
  });
}

function collectSystemCandidates(
  snapshot: NotificationSourceSnapshot,
  now: number,
  thresholds: NotificationEngineThresholds,
): NotificationCandidate[] {
  const system = snapshot.system;
  if (!system) return [];
  const candidates: NotificationCandidate[] = [];

  if (system.offline) {
    candidates.push({
      type: 'system_status',
      priority: 'high',
      record: { entityType: 'system', entityId: 'connectivity', label: 'Verbindung' },
      reason: 'VINCERE ist offline. Änderungen werden nur lokal vorgemerkt.',
      recommendedAction: 'Internetverbindung prüfen; keine externe Zustellung auslösen',
      deduplicationKey: 'system:connectivity:offline',
      stateFingerprint: 'offline',
      escalation: { stage: 'overdue' },
      metadata: { sourceModule: 'offline', coordinationKey: 'system:connectivity' },
    });
  }

  if (system.syncFailedAt) {
    const failedAt = parseDate(system.syncFailedAt);
    if (failedAt === null) {
      candidates.push(
        invalidDateCandidate({
          entityType: 'system',
          entityId: 'sync',
          label: 'Synchronisation',
          fieldName: 'syncFailedAt',
          value: system.syncFailedAt,
          sourceModule: 'sync',
        }),
      );
    } else {
      const ageMinutes = Math.max(0, (now - failedAt) / MINUTE_MS);
      const stage: EscalationStage = ageMinutes >= thresholds.syncCriticalMinutes ? 'critical' : 'overdue';
      candidates.push({
        type: 'system_status',
        priority: stage === 'critical' ? 'critical' : 'high',
        record: { entityType: 'system', entityId: 'sync', label: 'Synchronisation' },
        reason: 'Synchronisation ist fehlgeschlagen.',
        dueAt: iso(failedAt),
        recommendedAction: 'Synchronisationsstatus und letzte lokale Änderungen prüfen',
        deduplicationKey: 'system:sync:failed',
        stateFingerprint: `${stage}:${iso(failedAt)}`,
        escalation: { stage },
        metadata: { sourceModule: 'sync' },
      });
    }
  }

  if (system.realtimeConnected === false && !system.offline) {
    const interruptedAt = parseDate(system.realtimeInterruptedAt) ?? now;
    candidates.push({
      type: 'system_status',
      priority: 'high',
      record: { entityType: 'system', entityId: 'realtime', label: 'Realtime-Verbindung' },
      reason: 'Realtime-Verbindung ist gestört.',
      dueAt: iso(interruptedAt),
      recommendedAction: 'Verbindungsstatus prüfen und Konfliktrisiko beachten',
      deduplicationKey: 'system:realtime:disconnected',
      stateFingerprint: `disconnected:${iso(interruptedAt)}`,
      escalation: { stage: 'overdue' },
      metadata: { sourceModule: 'realtime', coordinationKey: 'system:connectivity' },
    });
  }

  return candidates;
}

function collectConflictCandidates(
  snapshot: NotificationSourceSnapshot,
  now: number,
  thresholds: NotificationEngineThresholds,
): NotificationCandidate[] {
  return (snapshot.conflicts ?? []).flatMap((conflict): NotificationCandidate[] => {
    if (conflict.resolved) return [];
    const waitingSince = parseDate(conflict.waitingSince);
    if (waitingSince === null) {
      return [
        invalidDateCandidate({
          entityType: 'conflict',
          entityId: conflict.id,
          label: conflict.label,
          fieldName: 'waitingSince',
          value: conflict.waitingSince,
          sourceModule: 'conflicts',
          contactId: conflict.contactId,
          propertyId: conflict.propertyId,
        }),
      ];
    }
    const ageHours = Math.max(0, (now - waitingSince) / HOUR_MS);
    const stage: EscalationStage = ageHours >= thresholds.conflictCriticalHours ? 'critical' : 'overdue';
    return [
      {
        type: 'conflict',
        priority: stage === 'critical' ? 'critical' : 'high',
        record: {
          entityType: 'conflict',
          entityId: conflict.id,
          label: conflict.label,
          contactId: conflict.contactId,
          propertyId: conflict.propertyId,
        },
        reason: 'Konflikt wartet auf Entscheidung.',
        dueAt: iso(waitingSince),
        recommendedAction: 'Konfliktvergleich öffnen und gültige Version auswählen',
        deduplicationKey: `conflict:${conflict.id}:decision`,
        stateFingerprint: `${stage}:${conflict.recordType}:${conflict.recordId}:${iso(waitingSince)}`,
        escalation: { stage },
        metadata: { sourceModule: 'conflicts' },
      },
    ];
  });
}

function collectRequirementCandidates(snapshot: NotificationSourceSnapshot, now: number): NotificationCandidate[] {
  return (snapshot.missingRequirements ?? []).flatMap((requirement): NotificationCandidate[] => {
    if (requirement.completed) return [];
    let stage: EscalationStage = 'due';
    let dueAt: string | undefined;
    if (requirement.dueAt) {
      const parsedDueAt = parseDate(requirement.dueAt);
      if (parsedDueAt === null) {
        return [
          invalidDateCandidate({
            entityType: requirement.requirementType,
            entityId: requirement.id,
            label: requirement.requirementLabel,
            fieldName: 'dueAt',
            value: requirement.dueAt,
            sourceModule: 'requirements',
            contactId: requirement.contactId,
            propertyId: requirement.propertyId,
          }),
        ];
      }
      dueAt = iso(parsedDueAt);
      stage = stageForDeadline(parsedDueAt, now, 24 * 60) ?? 'upcoming';
    }

    return [
      {
        type: 'warning',
        priority: priorityForStage(stage),
        record: {
          entityType: requirement.requirementType,
          entityId: requirement.id,
          label: requirement.requirementLabel,
          contactId: requirement.contactId,
          propertyId: requirement.propertyId,
        },
        reason: `${requirement.requirementType === 'document' ? 'Dokument' : 'Aufgabe'} fehlt für ${requirement.parentLabel}.`,
        dueAt,
        recommendedAction: `${requirement.requirementLabel} ergänzen oder als nicht erforderlich markieren`,
        deduplicationKey: `${requirement.requirementType}:${requirement.id}:missing`,
        stateFingerprint: `${stage}:${requirement.parentType}:${requirement.parentId}:${dueAt ?? 'no-due'}`,
        escalation: { stage },
        metadata: {
          sourceModule: 'requirements',
          coordinationKey: `${requirement.parentType}:${requirement.parentId}:requirements`,
        },
      },
    ];
  });
}

export function collectNotificationCandidates(
  snapshot: NotificationSourceSnapshot,
  nowIso: string,
  thresholds: NotificationEngineThresholds,
): NotificationCandidate[] {
  const now = parseDate(nowIso);
  if (now === null) throw new Error(`Invalid engine timestamp: ${nowIso}`);

  return [
    ...collectFollowUpCandidates(snapshot, now, thresholds),
    ...collectAppointmentCandidates(snapshot, now, thresholds),
    ...collectContactCandidates(snapshot, now, thresholds),
    ...collectPropertyCandidates(snapshot, now),
    ...collectSystemCandidates(snapshot, now, thresholds),
    ...collectConflictCandidates(snapshot, now, thresholds),
    ...collectRequirementCandidates(snapshot, now),
  ];
}
