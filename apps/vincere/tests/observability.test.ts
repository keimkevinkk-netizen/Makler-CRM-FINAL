import { describe, expect, it } from 'vitest';
import {
  InMemoryObservabilityProvider,
  ObservabilityHub,
  redactContext,
  sanitizeText,
} from '../src/observability/observability';

describe('VINCERE observability', () => {
  it('removes common personal and authentication data from messages', () => {
    const sanitized = sanitizeText('Mail kevin@example.de, Telefon +49 171 2345678, Bearer abc.def.ghi, https://example.test/path?token=secret');

    expect(sanitized).not.toContain('kevin@example.de');
    expect(sanitized).not.toContain('+49 171 2345678');
    expect(sanitized).not.toContain('abc.def.ghi');
    expect(sanitized).not.toContain('token=secret');
    expect(sanitized).toContain('[EMAIL]');
    expect(sanitized).toContain('[PHONE]');
  });

  it('redacts sensitive context keys recursively', () => {
    const redacted = redactContext({
      operation: 'contact-save',
      email: 'kevin@example.de',
      nested: { accessToken: 'secret', status: 409 },
    });

    expect(redacted).toEqual({
      operation: 'contact-save',
      email: '[REDACTED]',
      nested: { accessToken: '[REDACTED]', status: 409 },
    });
  });

  it('caps in-memory events to avoid unbounded browser memory growth', () => {
    const provider = new InMemoryObservabilityProvider(2);
    const hub = new ObservabilityHub([provider]);

    hub.capture({ category: 'frontend', level: 'info', name: 'one' });
    hub.capture({ category: 'network', level: 'warning', name: 'two' });
    hub.capture({ category: 'sync', level: 'error', name: 'three' });

    expect(provider.events()).toHaveLength(2);
    expect(provider.events().map((event) => event.name)).toEqual(['two', 'three']);
  });
});
