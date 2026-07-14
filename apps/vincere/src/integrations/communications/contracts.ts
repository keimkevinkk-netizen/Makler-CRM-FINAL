export type CommunicationChannel = 'email' | 'calendar' | 'phone' | 'messaging' | 'webhook';
export type CommunicationDirection = 'inbound' | 'outbound' | 'internal';
export type ProviderRuntime = 'server' | 'mock';

export type ProviderAuthState = 'connected' | 'expired' | 'revoked' | 'missing' | 'mock';
export type ProviderRateLimitStatus = 'ok' | 'near_limit' | 'limited' | 'unknown';
export type ProviderErrorCode =
  | 'aborted'
  | 'timeout'
  | 'offline'
  | 'rate_limited'
  | 'authentication_expired'
  | 'authentication_required'
  | 'invalid_request'
  | 'duplicate_event'
  | 'provider_unavailable'
  | 'unknown';

export interface ProviderMetadata {
  key: string;
  displayName: string;
  version: string;
  channels: CommunicationChannel[];
  serverOnly: true;
  synthetic: boolean;
  documentationUrl?: string;
}

export interface ProviderAuthenticationStatus {
  state: ProviderAuthState;
  connectionId?: string;
  expiresAt?: string;
  reauthorizationRequired: boolean;
  checkedAt: string;
}

export interface ProviderRateLimitState {
  status: ProviderRateLimitStatus;
  limit?: number;
  remaining?: number;
  resetAt?: string;
  retryAfterMs?: number;
}

export interface ProviderSyncCursor {
  value: string | null;
  checkpointAt: string | null;
  hasMore: boolean;
}

export interface ProviderFailure {
  code: ProviderErrorCode;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
  providerReference?: string;
}

export interface ProviderExecutionContext {
  requestId: string;
  requestedAt: string;
  timeoutMs: number;
  signal?: AbortSignal;
  runtime: ProviderRuntime;
  connectionRef?: {
    connectionId: string;
  };
}

export interface ProviderResponseMeta {
  requestId: string;
  durationMs: number;
  provider: ProviderMetadata;
  authentication: ProviderAuthenticationStatus;
  rateLimit: ProviderRateLimitState;
  syncCursor: ProviderSyncCursor;
}

export type ProviderResult<T> =
  | { ok: true; data: T; meta: ProviderResponseMeta }
  | { ok: false; error: ProviderFailure; meta: ProviderResponseMeta };

export interface ContactIdentityHints {
  contactId?: string;
  email?: string;
  phone?: string;
  externalProviderId?: string;
}

export interface CommunicationParticipant extends ContactIdentityHints {
  displayName?: string;
}

export interface EmailMessage {
  providerEventId: string;
  threadId: string;
  direction: Extract<CommunicationDirection, 'inbound' | 'outbound'>;
  subject: string;
  bodyPreview: string;
  sender: CommunicationParticipant;
  recipients: CommunicationParticipant[];
  occurredAt: string;
  unread: boolean;
}

export interface CalendarEntry {
  providerEventId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  status: 'confirmed' | 'cancelled';
  attendees: CommunicationParticipant[];
  organizer?: CommunicationParticipant;
}

export interface PhoneEvent {
  providerEventId: string;
  direction: Extract<CommunicationDirection, 'inbound' | 'outbound'>;
  occurredAt: string;
  endedAt?: string;
  outcome: 'answered' | 'missed' | 'voicemail' | 'failed';
  remoteParty: CommunicationParticipant;
  note?: string;
}

export interface MessagingEvent {
  providerEventId: string;
  conversationId: string;
  direction: Extract<CommunicationDirection, 'inbound' | 'outbound'>;
  occurredAt: string;
  bodyPreview: string;
  sender: CommunicationParticipant;
  recipients: CommunicationParticipant[];
  unread: boolean;
}

export interface WebhookEnvelope {
  providerEventId: string;
  providerKey: string;
  eventType: string;
  occurredAt: string;
  receivedAt: string;
  payload: Record<string, unknown>;
}

export interface ReadEmailRequest {
  cursor?: ProviderSyncCursor;
  since?: string;
  unreadOnly?: boolean;
  pageSize?: number;
}

export interface ReadEmailResponse {
  messages: EmailMessage[];
}

export interface SendEmailRequest {
  draftId: string;
  subject: string;
  body: string;
  recipients: CommunicationParticipant[];
  idempotencyKey: string;
}

export interface SendEmailResponse {
  providerEventId: string;
  acceptedAt: string;
  deliveryState: 'accepted' | 'queued';
}

export interface ReadCalendarRequest {
  cursor?: ProviderSyncCursor;
  startsAfter: string;
  startsBefore: string;
  includeCancelled?: boolean;
}

export interface ReadCalendarResponse {
  entries: CalendarEntry[];
}

export interface CreateAppointmentRequest {
  draftId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  attendees: CommunicationParticipant[];
  idempotencyKey: string;
}

export interface CreateAppointmentResponse {
  providerEventId: string;
  acceptedAt: string;
  status: 'confirmed' | 'pending';
}

export interface ReceivePhoneEventsRequest {
  cursor?: ProviderSyncCursor;
  since?: string;
  pageSize?: number;
}

export interface ReceivePhoneEventsResponse {
  events: PhoneEvent[];
}

export interface SendMessageRequest {
  draftId: string;
  body: string;
  recipients: CommunicationParticipant[];
  idempotencyKey: string;
}

export interface SendMessageResponse {
  providerEventId: string;
  acceptedAt: string;
  deliveryState: 'accepted' | 'queued';
}

export interface ProcessWebhookRequest {
  envelope: WebhookEnvelope;
  idempotencyKey: string;
}

export interface ProcessWebhookResponse {
  accepted: boolean;
  duplicate: boolean;
  normalizedEventType: string;
}

export interface EmailReadProvider {
  readEmail(request: ReadEmailRequest, context: ProviderExecutionContext): Promise<ProviderResult<ReadEmailResponse>>;
}

export interface EmailSendProvider {
  sendEmail(request: SendEmailRequest, context: ProviderExecutionContext): Promise<ProviderResult<SendEmailResponse>>;
}

export interface CalendarReadProvider {
  readCalendar(request: ReadCalendarRequest, context: ProviderExecutionContext): Promise<ProviderResult<ReadCalendarResponse>>;
}

export interface AppointmentCreateProvider {
  createAppointment(request: CreateAppointmentRequest, context: ProviderExecutionContext): Promise<ProviderResult<CreateAppointmentResponse>>;
}

export interface PhoneEventReceiveProvider {
  receivePhoneEvents(request: ReceivePhoneEventsRequest, context: ProviderExecutionContext): Promise<ProviderResult<ReceivePhoneEventsResponse>>;
}

export interface MessageSendProvider {
  sendMessage(request: SendMessageRequest, context: ProviderExecutionContext): Promise<ProviderResult<SendMessageResponse>>;
}

export interface WebhookEventProvider {
  processWebhook(request: ProcessWebhookRequest, context: ProviderExecutionContext): Promise<ProviderResult<ProcessWebhookResponse>>;
}

export interface CommunicationProviderBundle
  extends EmailReadProvider,
    EmailSendProvider,
    CalendarReadProvider,
    AppointmentCreateProvider,
    PhoneEventReceiveProvider,
    MessageSendProvider,
    WebhookEventProvider {
  readonly metadata: ProviderMetadata;
}
