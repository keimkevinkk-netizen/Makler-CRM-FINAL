import type {
  CalendarEntry,
  CommunicationProviderBundle,
  CreateAppointmentRequest,
  CreateAppointmentResponse,
  EmailMessage,
  MessagingEvent,
  PhoneEvent,
  ProcessWebhookRequest,
  ProcessWebhookResponse,
  ProviderAuthenticationStatus,
  ProviderErrorCode,
  ProviderExecutionContext,
  ProviderFailure,
  ProviderMetadata,
  ProviderRateLimitState,
  ProviderResponseMeta,
  ProviderResult,
  ProviderSyncCursor,
  ReadCalendarRequest,
  ReadCalendarResponse,
  ReadEmailRequest,
  ReadEmailResponse,
  ReceivePhoneEventsRequest,
  ReceivePhoneEventsResponse,
  SendEmailRequest,
  SendEmailResponse,
  SendMessageRequest,
  SendMessageResponse,
  WebhookEnvelope,
} from './contracts';

export type MockProviderScenario = 'healthy' | 'offline' | 'rate_limit' | 'expired_connection';

export interface MockCommunicationProviderOptions {
  scenario?: MockProviderScenario;
  latencyMs?: number;
  now?: () => Date;
}

const FIXED_NOW = '2026-07-14T08:00:00.000Z';

export const MOCK_EMAIL_MESSAGES: EmailMessage[] = [
  {
    providerEventId: 'mock-email-in-001',
    threadId: 'mock-thread-owner-001',
    direction: 'inbound',
    subject: 'Rückfrage zur unverbindlichen Bewertung',
    bodyPreview: 'Guten Tag, welche Unterlagen benötigen Sie für die erste Einschätzung?',
    sender: {
      displayName: 'Synthetischer Eigentümerkontakt',
      email: 'owner.one@example.invalid',
      phone: '+49 160 0000001',
    },
    recipients: [{ displayName: 'VINCERE Demo-Postfach', email: 'office@example.invalid' }],
    occurredAt: '2026-07-14T07:35:00.000Z',
    unread: true,
  },
  {
    providerEventId: 'mock-email-out-001',
    threadId: 'mock-thread-followup-001',
    direction: 'outbound',
    subject: 'Zusammenfassung unseres Gesprächs',
    bodyPreview: 'Vielen Dank für das Gespräch. Die nächsten Schritte habe ich kurz zusammengefasst.',
    sender: { displayName: 'VINCERE Demo-Postfach', email: 'office@example.invalid' },
    recipients: [{ displayName: 'Synthetischer Kontakt', email: 'contact.two@example.invalid' }],
    occurredAt: '2026-07-13T14:10:00.000Z',
    unread: false,
  },
];

export const MOCK_CALENDAR_ENTRIES: CalendarEntry[] = [
  {
    providerEventId: 'mock-calendar-001',
    title: 'Bewertungsgespräch – synthetischer Termin',
    description: 'Nur anonyme Mock-Daten. Keine externe Kalenderverbindung.',
    startsAt: '2026-07-14T11:00:00.000Z',
    endsAt: '2026-07-14T11:45:00.000Z',
    status: 'confirmed',
    attendees: [{ email: 'owner.one@example.invalid', displayName: 'Synthetischer Eigentümerkontakt' }],
  },
  {
    providerEventId: 'mock-calendar-cancelled-001',
    title: 'Abgesagter Besichtigungstermin',
    startsAt: '2026-07-14T15:00:00.000Z',
    endsAt: '2026-07-14T15:30:00.000Z',
    status: 'cancelled',
    attendees: [{ phone: '+49 160 0000003', displayName: 'Synthetischer Interessent' }],
  },
];

export const MOCK_PHONE_EVENTS: PhoneEvent[] = [
  {
    providerEventId: 'mock-phone-missed-001',
    direction: 'inbound',
    occurredAt: '2026-07-14T07:52:00.000Z',
    outcome: 'missed',
    remoteParty: { phone: '+49 160 0000004', displayName: 'Unbekannter synthetischer Anrufer' },
  },
  {
    providerEventId: 'mock-phone-answered-001',
    direction: 'outbound',
    occurredAt: '2026-07-13T16:20:00.000Z',
    endedAt: '2026-07-13T16:31:00.000Z',
    outcome: 'answered',
    remoteParty: { contactId: 'contact-002', phone: '+49 160 0000002', displayName: 'Synthetischer Kontakt' },
    note: 'Mock-Gespräch ohne personenbezogene Echtdaten.',
  },
];

export const MOCK_MESSAGING_EVENTS: MessagingEvent[] = [
  {
    providerEventId: 'mock-message-in-001',
    conversationId: 'mock-conversation-001',
    direction: 'inbound',
    occurredAt: '2026-07-14T07:44:00.000Z',
    bodyPreview: 'Können wir den Termin bitte auf morgen verschieben?',
    sender: { externalProviderId: 'messaging-contact-001', phone: '+49 160 0000001' },
    recipients: [{ displayName: 'VINCERE Demo-Kanal' }],
    unread: true,
  },
];

export const MOCK_DUPLICATE_WEBHOOKS: WebhookEnvelope[] = [
  {
    providerEventId: 'mock-webhook-duplicate-001',
    providerKey: 'vincere-safe-mock',
    eventType: 'message.received',
    occurredAt: '2026-07-14T07:44:00.000Z',
    receivedAt: '2026-07-14T07:44:01.000Z',
    payload: { synthetic: true, messageReference: 'mock-message-in-001' },
  },
  {
    providerEventId: 'mock-webhook-duplicate-001',
    providerKey: 'vincere-safe-mock',
    eventType: 'message.received',
    occurredAt: '2026-07-14T07:44:00.000Z',
    receivedAt: '2026-07-14T07:44:03.000Z',
    payload: { synthetic: true, messageReference: 'mock-message-in-001' },
  },
];

const waitForDelay = (delayMs: number, signal?: AbortSignal): Promise<'completed' | 'aborted'> => {
  if (delayMs <= 0) return Promise.resolve(signal?.aborted ? 'aborted' : 'completed');

  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: 'completed' | 'aborted') => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      resolve(result);
    };
    const abort = () => finish('aborted');
    timer = setTimeout(() => finish('completed'), delayMs);
    signal?.addEventListener('abort', abort, { once: true });
  });
};

export class MockCommunicationProvider implements CommunicationProviderBundle {
  readonly metadata: ProviderMetadata = {
    key: 'vincere-safe-mock',
    displayName: 'VINCERE sicherer Mock-Provider',
    version: '1.0.0',
    channels: ['email', 'calendar', 'phone', 'messaging', 'webhook'],
    serverOnly: true,
    synthetic: true,
  };

  private readonly scenario: MockProviderScenario;
  private readonly latencyMs: number;
  private readonly now: () => Date;
  private cursorSequence = 0;
  private readonly processedWebhookKeys = new Set<string>();

  constructor(options: MockCommunicationProviderOptions = {}) {
    this.scenario = options.scenario ?? 'healthy';
    this.latencyMs = options.latencyMs ?? 0;
    this.now = options.now ?? (() => new Date(FIXED_NOW));
  }

  async readEmail(request: ReadEmailRequest, context: ProviderExecutionContext): Promise<ProviderResult<ReadEmailResponse>> {
    const sinceMs = request.since ? new Date(request.since).getTime() : Number.NEGATIVE_INFINITY;
    const matching = MOCK_EMAIL_MESSAGES
      .filter((message) => !request.unreadOnly || message.unread)
      .filter((message) => new Date(message.occurredAt).getTime() >= sinceMs);
    const pageSize = Math.max(1, request.pageSize ?? (matching.length || 1));
    return this.execute(context, matching.length > pageSize, () => ({ messages: matching.slice(0, pageSize) }));
  }

  async sendEmail(request: SendEmailRequest, context: ProviderExecutionContext): Promise<ProviderResult<SendEmailResponse>> {
    return this.execute(context, false, () => ({
      providerEventId: `mock-email-${request.idempotencyKey}`,
      acceptedAt: this.now().toISOString(),
      deliveryState: 'accepted',
    }));
  }

  async readCalendar(request: ReadCalendarRequest, context: ProviderExecutionContext): Promise<ProviderResult<ReadCalendarResponse>> {
    const start = new Date(request.startsAfter).getTime();
    const end = new Date(request.startsBefore).getTime();
    return this.execute(context, false, () => ({
      entries: MOCK_CALENDAR_ENTRIES.filter((entry) => {
        const startsAt = new Date(entry.startsAt).getTime();
        return startsAt >= start && startsAt < end && (request.includeCancelled || entry.status !== 'cancelled');
      }),
    }));
  }

  async createAppointment(request: CreateAppointmentRequest, context: ProviderExecutionContext): Promise<ProviderResult<CreateAppointmentResponse>> {
    return this.execute(context, false, () => ({
      providerEventId: `mock-calendar-${request.idempotencyKey}`,
      acceptedAt: this.now().toISOString(),
      status: 'confirmed',
    }));
  }

  async receivePhoneEvents(request: ReceivePhoneEventsRequest, context: ProviderExecutionContext): Promise<ProviderResult<ReceivePhoneEventsResponse>> {
    const sinceMs = request.since ? new Date(request.since).getTime() : Number.NEGATIVE_INFINITY;
    const matching = MOCK_PHONE_EVENTS.filter((event) => new Date(event.occurredAt).getTime() >= sinceMs);
    const pageSize = Math.max(1, request.pageSize ?? (matching.length || 1));
    return this.execute(context, matching.length > pageSize, () => ({ events: matching.slice(0, pageSize) }));
  }

  async sendMessage(request: SendMessageRequest, context: ProviderExecutionContext): Promise<ProviderResult<SendMessageResponse>> {
    return this.execute(context, false, () => ({
      providerEventId: `mock-message-${request.idempotencyKey}`,
      acceptedAt: this.now().toISOString(),
      deliveryState: 'accepted',
    }));
  }

  async processWebhook(request: ProcessWebhookRequest, context: ProviderExecutionContext): Promise<ProviderResult<ProcessWebhookResponse>> {
    return this.execute(context, false, () => {
      const duplicate = this.processedWebhookKeys.has(request.idempotencyKey);
      if (!duplicate) this.processedWebhookKeys.add(request.idempotencyKey);
      return {
        accepted: !duplicate,
        duplicate,
        normalizedEventType: request.envelope.eventType.trim().toLowerCase(),
      };
    });
  }

  private async execute<T>(
    context: ProviderExecutionContext,
    hasMore: boolean,
    operation: () => T,
  ): Promise<ProviderResult<T>> {
    const startedAt = Date.now();

    if (context.signal?.aborted) return this.failure(context, startedAt, 'aborted', 'Die Anfrage wurde abgebrochen.', false);
    if (context.runtime !== 'mock') return this.failure(context, startedAt, 'invalid_request', 'Der Mock-Provider darf nur im Mock-Laufzeitmodus verwendet werden.', false);
    if (this.scenario === 'offline') return this.failure(context, startedAt, 'offline', 'Der Mock-Provider ist offline.', true);
    if (this.scenario === 'rate_limit') return this.failure(context, startedAt, 'rate_limited', 'Das synthetische Rate Limit ist erreicht.', true, 60_000);
    if (this.scenario === 'expired_connection') return this.failure(context, startedAt, 'authentication_expired', 'Die synthetische Verbindung ist abgelaufen.', false);
    if (context.timeoutMs <= 0 || this.latencyMs > context.timeoutMs) {
      return this.failure(context, startedAt, 'timeout', 'Das konfigurierte Zeitlimit wurde überschritten.', true);
    }

    const delayResult = await waitForDelay(this.latencyMs, context.signal);
    if (delayResult === 'aborted') return this.failure(context, startedAt, 'aborted', 'Die Anfrage wurde abgebrochen.', false);

    try {
      return {
        ok: true,
        data: operation(),
        meta: this.meta(context, startedAt, hasMore),
      };
    } catch (error) {
      return this.failure(
        context,
        startedAt,
        'unknown',
        error instanceof Error ? error.message : 'Unbekannter Mock-Providerfehler.',
        false,
      );
    }
  }

  private failure<T>(
    context: ProviderExecutionContext,
    startedAt: number,
    code: ProviderErrorCode,
    message: string,
    retryable: boolean,
    retryAfterMs?: number,
  ): ProviderResult<T> {
    const error: ProviderFailure = { code, message, retryable, retryAfterMs };
    return { ok: false, error, meta: this.meta(context, startedAt, false, code, retryAfterMs) };
  }

  private meta(
    context: ProviderExecutionContext,
    startedAt: number,
    hasMore: boolean,
    failureCode?: ProviderErrorCode,
    retryAfterMs?: number,
  ): ProviderResponseMeta {
    return {
      requestId: context.requestId,
      durationMs: Math.max(0, Date.now() - startedAt),
      provider: this.metadata,
      authentication: this.authentication(failureCode),
      rateLimit: this.rateLimit(failureCode, retryAfterMs),
      syncCursor: this.nextCursor(hasMore),
    };
  }

  private authentication(failureCode?: ProviderErrorCode): ProviderAuthenticationStatus {
    const expired = failureCode === 'authentication_expired';
    return {
      state: expired ? 'expired' : 'mock',
      connectionId: 'mock-connection',
      expiresAt: expired ? '2026-07-13T08:00:00.000Z' : '2099-01-01T00:00:00.000Z',
      reauthorizationRequired: expired,
      checkedAt: this.now().toISOString(),
    };
  }

  private rateLimit(failureCode?: ProviderErrorCode, retryAfterMs?: number): ProviderRateLimitState {
    if (failureCode === 'rate_limited') {
      return {
        status: 'limited',
        limit: 100,
        remaining: 0,
        resetAt: new Date(this.now().getTime() + (retryAfterMs ?? 60_000)).toISOString(),
        retryAfterMs,
      };
    }
    return { status: 'ok', limit: 100, remaining: 99 };
  }

  private nextCursor(hasMore: boolean): ProviderSyncCursor {
    this.cursorSequence += 1;
    return {
      value: `mock-cursor-${String(this.cursorSequence).padStart(4, '0')}`,
      checkpointAt: this.now().toISOString(),
      hasMore,
    };
  }
}
