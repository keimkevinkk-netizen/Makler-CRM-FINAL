import type { WebhookEnvelope } from '../../integrations/communications/contracts';

export interface IdempotencyDecision {
  accepted: boolean;
  duplicate: boolean;
  key: string;
  firstSeenAt: string;
}

export interface IdempotencyLedgerOptions {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => Date;
}

interface LedgerEntry {
  firstSeenAtMs: number;
  expiresAtMs: number;
}

const canonicalize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
};

const stableHash = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const buildWebhookIdempotencyKey = (envelope: WebhookEnvelope): string => {
  const providerEventId = envelope.providerEventId.trim();
  if (providerEventId) return `${envelope.providerKey}:${providerEventId}`;
  return `${envelope.providerKey}:fallback:${stableHash(canonicalize({
    eventType: envelope.eventType,
    occurredAt: envelope.occurredAt,
    payload: envelope.payload,
  }))}`;
};

export class IdempotencyLedger {
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly now: () => Date;
  private readonly entries = new Map<string, LedgerEntry>();

  constructor(options: IdempotencyLedgerOptions = {}) {
    this.ttlMs = Math.max(1, options.ttlMs ?? 24 * 60 * 60 * 1000);
    this.maxEntries = Math.max(10, options.maxEntries ?? 10_000);
    this.now = options.now ?? (() => new Date());
  }

  accept(key: string): IdempotencyDecision {
    const normalizedKey = key.trim();
    if (!normalizedKey) throw new Error('Für die Idempotenzprüfung ist ein Schlüssel erforderlich.');

    const nowMs = this.now().getTime();
    this.prune(nowMs);
    const existing = this.entries.get(normalizedKey);
    if (existing && existing.expiresAtMs > nowMs) {
      return {
        accepted: false,
        duplicate: true,
        key: normalizedKey,
        firstSeenAt: new Date(existing.firstSeenAtMs).toISOString(),
      };
    }

    this.entries.set(normalizedKey, { firstSeenAtMs: nowMs, expiresAtMs: nowMs + this.ttlMs });
    this.enforceLimit();
    return {
      accepted: true,
      duplicate: false,
      key: normalizedKey,
      firstSeenAt: new Date(nowMs).toISOString(),
    };
  }

  has(key: string): boolean {
    const nowMs = this.now().getTime();
    this.prune(nowMs);
    const entry = this.entries.get(key.trim());
    return Boolean(entry && entry.expiresAtMs > nowMs);
  }

  get size(): number {
    this.prune(this.now().getTime());
    return this.entries.size;
  }

  private prune(nowMs: number) {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAtMs <= nowMs) this.entries.delete(key);
    }
  }

  private enforceLimit() {
    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value as string | undefined;
      if (!oldestKey) return;
      this.entries.delete(oldestKey);
    }
  }
}
