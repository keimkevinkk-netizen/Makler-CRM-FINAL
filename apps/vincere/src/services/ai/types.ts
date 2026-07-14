export type AiProviderMode = 'mock' | 'server';
export type AiProviderState = 'ready' | 'offline' | 'rate_limited' | 'error';

export type AiProviderErrorCode =
  | 'aborted'
  | 'timeout'
  | 'rate_limited'
  | 'invalid_response'
  | 'unavailable'
  | 'unknown';

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;
  readonly retryAfterMs?: number;

  constructor(code: AiProviderErrorCode, message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

export interface AiResponseSchema<TOutput> {
  name: string;
  parse: (value: unknown) => TOutput;
}

export interface AiStructuredRequest<TInput, TOutput> {
  task: string;
  input: TInput;
  schema: AiResponseSchema<TOutput>;
  requestId?: string;
  metadata?: Record<string, string>;
}

export interface AiStructuredResponse<TOutput> {
  requestId: string;
  providerId: string;
  providerMode: AiProviderMode;
  data: TOutput;
  receivedAt: string;
}

export interface AiInferenceOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface AiProvider {
  id: string;
  mode: AiProviderMode;
  state: AiProviderState;
  generate: (request: {
    task: string;
    input: unknown;
    schemaName: string;
    requestId: string;
  }, signal: AbortSignal) => Promise<unknown>;
}
