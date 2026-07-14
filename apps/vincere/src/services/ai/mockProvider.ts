import { AiProviderError, type AiProvider, type AiProviderErrorCode, type AiProviderState } from './types';

export type MockAiHandler = (input: unknown) => unknown | Promise<unknown>;

export interface MockAiProviderOptions {
  handlers: Record<string, MockAiHandler>;
  latencyMs?: number;
  state?: AiProviderState;
  failWith?: { code: AiProviderErrorCode; message: string; retryAfterMs?: number };
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

export function createMockAiProvider(options: MockAiProviderOptions): AiProvider {
  return {
    id: 'vincere-mock-provider',
    mode: 'mock',
    state: options.state ?? 'ready',
    async generate(request, signal) {
      await wait(options.latencyMs ?? 25, signal);
      if (options.failWith) {
        throw new AiProviderError(options.failWith.code, options.failWith.message, options.failWith.retryAfterMs);
      }
      const handler = options.handlers[request.task];
      if (!handler) throw new AiProviderError('unavailable', `Kein Mock-Handler für ${request.task}.`);
      return handler(request.input);
    },
  };
}
