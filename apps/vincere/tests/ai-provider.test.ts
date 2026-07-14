import { describe, expect, it } from 'vitest';
import { createMockAiProvider } from '../src/services/ai/mockProvider';
import { requestStructured } from '../src/services/ai/provider';
import { AiProviderError } from '../src/services/ai/types';

const textSchema = {
  name: 'text.v1',
  parse(value: unknown) {
    if (typeof value !== 'string') throw new Error('Text erwartet.');
    return value;
  },
};

describe('providerunabhängige AI-Schnittstelle', () => {
  it('liefert strukturierte Antworten im Offline-/Mock-Modus', async () => {
    const provider = createMockAiProvider({ handlers: { echo: (input) => String(input) }, latencyMs: 0 });
    const response = await requestStructured(provider, { task: 'echo', input: 'VINCERE', schema: textSchema });
    expect(response.data).toBe('VINCERE');
    expect(response.providerMode).toBe('mock');
  });

  it('bricht langsame Anfragen über den Timeout ab', async () => {
    const provider = createMockAiProvider({ handlers: { echo: () => 'zu spät' }, latencyMs: 50 });
    await expect(requestStructured(provider, { task: 'echo', input: '', schema: textSchema }, { timeoutMs: 5 }))
      .rejects.toMatchObject({ code: 'timeout' });
  });

  it('respektiert einen externen AbortSignal', async () => {
    const provider = createMockAiProvider({ handlers: { echo: () => 'zu spät' }, latencyMs: 50 });
    const controller = new AbortController();
    const pending = requestStructured(provider, { task: 'echo', input: '', schema: textSchema }, { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'aborted' });
  });

  it('bildet Rate-Limit-Zustände eindeutig ab', async () => {
    const provider = createMockAiProvider({ handlers: {}, state: 'rate_limited' });
    await expect(requestStructured(provider, { task: 'echo', input: '', schema: textSchema }))
      .rejects.toEqual(expect.objectContaining<Partial<AiProviderError>>({ code: 'rate_limited' }));
  });

  it('weist ungültige strukturierte Antworten zurück', async () => {
    const provider = createMockAiProvider({ handlers: { echo: () => 42 }, latencyMs: 0 });
    await expect(requestStructured(provider, { task: 'echo', input: '', schema: textSchema }))
      .rejects.toMatchObject({ code: 'invalid_response' });
  });
});
