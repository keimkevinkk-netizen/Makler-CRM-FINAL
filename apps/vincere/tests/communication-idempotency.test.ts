import { describe, expect, it } from 'vitest';
import type { WebhookEnvelope } from '../src/integrations/communications/contracts';
import { buildWebhookIdempotencyKey, IdempotencyLedger } from '../src/services/communications/idempotency';

const envelope: WebhookEnvelope = {
  providerEventId: 'provider-event-001',
  providerKey: 'mock-provider',
  eventType: 'message.received',
  occurredAt: '2026-07-14T08:00:00.000Z',
  receivedAt: '2026-07-14T08:00:01.000Z',
  payload: { synthetic: true },
};

describe('communication event idempotency', () => {
  it('builds a provider-scoped key from the external event id', () => {
    expect(buildWebhookIdempotencyKey(envelope)).toBe('mock-provider:provider-event-001');
  });

  it('accepts an event only once within the retention window', () => {
    const ledger = new IdempotencyLedger({ now: () => new Date('2026-07-14T08:00:00.000Z') });
    const key = buildWebhookIdempotencyKey(envelope);

    expect(ledger.accept(key)).toMatchObject({ accepted: true, duplicate: false });
    expect(ledger.accept(key)).toMatchObject({ accepted: false, duplicate: true });
    expect(ledger.size).toBe(1);
  });

  it('allows a key again after its ttl has elapsed', () => {
    let now = new Date('2026-07-14T08:00:00.000Z');
    const ledger = new IdempotencyLedger({ ttlMs: 1_000, now: () => now });
    const key = buildWebhookIdempotencyKey(envelope);

    expect(ledger.accept(key).accepted).toBe(true);
    now = new Date('2026-07-14T08:00:02.000Z');
    expect(ledger.accept(key).accepted).toBe(true);
  });

  it('uses a deterministic fallback fingerprint when no event id is supplied', () => {
    const first = buildWebhookIdempotencyKey({ ...envelope, providerEventId: '' });
    const second = buildWebhookIdempotencyKey({
      ...envelope,
      providerEventId: '',
      payload: { synthetic: true },
    });

    expect(first).toBe(second);
    expect(first).toContain('mock-provider:fallback:');
  });
});
