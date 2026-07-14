import { describe, expect, it } from 'vitest';
import type { ProviderExecutionContext } from '../src/integrations/communications/contracts';
import {
  MOCK_CALENDAR_ENTRIES,
  MOCK_DUPLICATE_WEBHOOKS,
  MOCK_EMAIL_MESSAGES,
  MOCK_MESSAGING_EVENTS,
  MOCK_PHONE_EVENTS,
  MockCommunicationProvider,
} from '../src/integrations/communications/mockProvider';

const context = (overrides: Partial<ProviderExecutionContext> = {}): ProviderExecutionContext => ({
  requestId: 'request-001',
  requestedAt: '2026-07-14T08:00:00.000Z',
  timeoutMs: 5_000,
  runtime: 'mock',
  ...overrides,
});

describe('safe mock communication provider', () => {
  it('contains all required synthetic scenarios without real personal data', () => {
    expect(MOCK_EMAIL_MESSAGES.some((message) => message.direction === 'inbound')).toBe(true);
    expect(MOCK_EMAIL_MESSAGES.some((message) => message.direction === 'outbound')).toBe(true);
    expect(MOCK_CALENDAR_ENTRIES.some((entry) => entry.status === 'confirmed')).toBe(true);
    expect(MOCK_CALENDAR_ENTRIES.some((entry) => entry.status === 'cancelled')).toBe(true);
    expect(MOCK_PHONE_EVENTS.some((event) => event.outcome === 'missed')).toBe(true);
    expect(MOCK_PHONE_EVENTS.some((event) => !event.remoteParty.contactId)).toBe(true);
    expect(MOCK_MESSAGING_EVENTS.some((event) => event.direction === 'inbound')).toBe(true);
    expect(MOCK_DUPLICATE_WEBHOOKS[0].providerEventId).toBe(MOCK_DUPLICATE_WEBHOOKS[1].providerEventId);
    expect(JSON.stringify({
      emails: MOCK_EMAIL_MESSAGES,
      calendar: MOCK_CALENDAR_ENTRIES,
      phones: MOCK_PHONE_EVENTS,
      messages: MOCK_MESSAGING_EVENTS,
    })).toMatch(/example\.invalid/);
  });

  it.each([
    ['offline', 'offline'],
    ['rate_limit', 'rate_limited'],
    ['expired_connection', 'authentication_expired'],
  ] as const)('returns a structured %s failure', async (scenario, expectedCode) => {
    const provider = new MockCommunicationProvider({ scenario });
    const result = await provider.readEmail({}, context());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe(expectedCode);
  });

  it('returns a timeout without starting a provider operation', async () => {
    const provider = new MockCommunicationProvider({ latencyMs: 100 });
    const result = await provider.readEmail({}, context({ timeoutMs: 10 }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('timeout');
  });

  it('honours aborted requests', async () => {
    const controller = new AbortController();
    controller.abort();
    const provider = new MockCommunicationProvider();
    const result = await provider.readEmail({}, context({ signal: controller.signal }));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('aborted');
  });

  it('advances deterministic sync cursors', async () => {
    const provider = new MockCommunicationProvider();
    const first = await provider.readEmail({}, context({ requestId: 'first' }));
    const second = await provider.receivePhoneEvents({}, context({ requestId: 'second' }));

    expect(first.meta.syncCursor.value).toBe('mock-cursor-0001');
    expect(second.meta.syncCursor.value).toBe('mock-cursor-0002');
  });

  it('marks repeatedly delivered webhook events as duplicates', async () => {
    const provider = new MockCommunicationProvider();
    const firstEnvelope = MOCK_DUPLICATE_WEBHOOKS[0];
    const duplicateEnvelope = MOCK_DUPLICATE_WEBHOOKS[1];
    const idempotencyKey = `${firstEnvelope.providerKey}:${firstEnvelope.providerEventId}`;

    const first = await provider.processWebhook({ envelope: firstEnvelope, idempotencyKey }, context({ requestId: 'first' }));
    const second = await provider.processWebhook({ envelope: duplicateEnvelope, idempotencyKey }, context({ requestId: 'second' }));

    expect(first.ok && first.data.accepted).toBe(true);
    expect(second.ok && second.data.duplicate).toBe(true);
  });
});
