import {
  AiProviderError,
  type AiInferenceOptions,
  type AiProvider,
  type AiStructuredRequest,
  type AiStructuredResponse,
} from './types';

const DEFAULT_TIMEOUT_MS = 12_000;

function requestId() {
  return crypto.randomUUID?.() ?? `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeProviderError(reason: unknown): AiProviderError {
  if (reason instanceof AiProviderError) return reason;
  if (reason instanceof DOMException && reason.name === 'AbortError') {
    return new AiProviderError('aborted', 'Die Anfrage wurde abgebrochen.');
  }
  if (reason instanceof Error) return new AiProviderError('unknown', reason.message);
  return new AiProviderError('unknown', 'Der KI-Provider hat einen unbekannten Fehler gemeldet.');
}

export async function requestStructured<TInput, TOutput>(
  provider: AiProvider,
  request: AiStructuredRequest<TInput, TOutput>,
  options: AiInferenceOptions = {},
): Promise<AiStructuredResponse<TOutput>> {
  if (provider.state === 'rate_limited') {
    throw new AiProviderError('rate_limited', 'Der Provider ist aktuell rate-limitiert.');
  }
  if (provider.state === 'offline' || provider.state === 'error') {
    throw new AiProviderError('unavailable', 'Der Provider ist aktuell nicht verfügbar.');
  }

  const controller = new AbortController();
  const id = request.requestId ?? requestId();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timedOut = false;

  const abortFromCaller = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abortFromCaller();
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort('timeout');
  }, timeoutMs);

  try {
    const raw = await provider.generate({
      task: request.task,
      input: request.input,
      schemaName: request.schema.name,
      requestId: id,
    }, controller.signal);

    let data: TOutput;
    try {
      data = request.schema.parse(raw);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Strukturprüfung fehlgeschlagen.';
      throw new AiProviderError('invalid_response', message);
    }

    return {
      requestId: id,
      providerId: provider.id,
      providerMode: provider.mode,
      data,
      receivedAt: new Date().toISOString(),
    };
  } catch (reason) {
    if (timedOut) throw new AiProviderError('timeout', `Die Anfrage wurde nach ${timeoutMs} ms beendet.`);
    if (options.signal?.aborted) throw new AiProviderError('aborted', 'Die Anfrage wurde abgebrochen.');
    throw normalizeProviderError(reason);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}
