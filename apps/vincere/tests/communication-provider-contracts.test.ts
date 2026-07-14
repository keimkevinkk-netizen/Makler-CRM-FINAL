import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ProviderExecutionContext } from '../src/integrations/communications/contracts';
import { MockCommunicationProvider } from '../src/integrations/communications/mockProvider';

const context = (signal?: AbortSignal): ProviderExecutionContext => ({
  requestId: 'request-001',
  requestedAt: '2026-07-14T08:00:00.000Z',
  timeoutMs: 5_000,
  signal,
  runtime: 'mock',
  connectionRef: { connectionId: 'mock-connection' },
});

describe('provider-independent communication contracts', () => {
  it('returns provider, authentication, rate limit and sync cursor metadata', async () => {
    const provider = new MockCommunicationProvider();
    const result = await provider.readEmail({ unreadOnly: true, pageSize: 1 }, context());

    expect(result.ok).toBe(true);
    expect(result.meta.provider.serverOnly).toBe(true);
    expect(result.meta.provider.synthetic).toBe(true);
    expect(result.meta.authentication.state).toBe('mock');
    expect(result.meta.rateLimit.status).toBe('ok');
    expect(result.meta.syncCursor.value).toBe('mock-cursor-0001');
    expect(result.meta.syncCursor.hasMore).toBe(false);
    if (result.ok) expect(result.data.messages).toHaveLength(1);
  });

  it('keeps credential material out of the browser contract', () => {
    const source = readFileSync(resolve(
      process.cwd(),
      'src/integrations/communications/contracts.ts',
    ), 'utf8');

    expect(source).toContain('serverOnly: true');
    expect(source).not.toMatch(/clientSecret|apiKey|accessToken|refreshToken|privateKey/i);
  });

  it('rejects non-mock runtime execution', async () => {
    const provider = new MockCommunicationProvider();
    const result = await provider.readEmail({}, { ...context(), runtime: 'server' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('invalid_request');
  });
});
