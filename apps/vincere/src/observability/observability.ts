import { runtimeConfig } from '../config/runtime';

export type ObservabilityCategory =
  | 'frontend'
  | 'network'
  | 'auth'
  | 'sync'
  | 'conflict'
  | 'performance'
  | 'provider';

export type ObservabilityLevel = 'info' | 'warning' | 'error';

export interface ObservabilityEvent {
  id: string;
  timestamp: string;
  environment: string;
  release: string;
  category: ObservabilityCategory;
  level: ObservabilityLevel;
  name: string;
  message?: string;
  durationMs?: number;
  context?: Record<string, unknown>;
}

export interface ObservabilityProvider {
  capture(event: ObservabilityEvent): void | Promise<void>;
}

const sensitiveKey = /(authorization|cookie|token|password|secret|email|phone|address|firstName|lastName|displayName|notes?|payload|content|workspaceId|userId)/i;
const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerPattern = /Bearer\s+[A-Za-z0-9._~-]+/gi;
const phonePattern = /(?:\+?\d[\d\s()./-]{6,}\d)/g;
const urlQueryPattern = /(https?:\/\/[^\s?#]+)[?#][^\s]*/gi;

export function sanitizeText(value: string) {
  return value
    .replace(bearerPattern, 'Bearer [REDACTED]')
    .replace(emailPattern, '[EMAIL]')
    .replace(phonePattern, '[PHONE]')
    .replace(urlQueryPattern, '$1');
}

function redactValue(value: unknown, depth: number): unknown {
  if (depth > 4) return '[TRUNCATED]';
  if (typeof value === 'string') return sanitizeText(value).slice(0, 500);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null || value === undefined) return value;
  if (value instanceof Error) return { name: value.name, message: sanitizeText(value.message) };
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => redactValue(entry, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 40).map(([key, entry]) => [
      key,
      sensitiveKey.test(key) ? '[REDACTED]' : redactValue(entry, depth + 1),
    ]));
  }
  return String(value);
}

export function redactContext(context?: Record<string, unknown>) {
  if (!context) return undefined;
  return redactValue(context, 0) as Record<string, unknown>;
}

export class InMemoryObservabilityProvider implements ObservabilityProvider {
  private readonly buffer: ObservabilityEvent[] = [];

  constructor(private readonly limit = 200) {}

  capture(event: ObservabilityEvent) {
    this.buffer.push(event);
    if (this.buffer.length > this.limit) this.buffer.splice(0, this.buffer.length - this.limit);
  }

  events() {
    return [...this.buffer];
  }

  clear() {
    this.buffer.length = 0;
  }
}

export class ConsoleObservabilityProvider implements ObservabilityProvider {
  capture(event: ObservabilityEvent) {
    const payload = { ...event, context: redactContext(event.context) };
    if (event.level === 'error') console.error('[VINCERE]', payload);
    else if (event.level === 'warning') console.warn('[VINCERE]', payload);
    else console.info('[VINCERE]', payload);
  }
}

export class ObservabilityHub {
  constructor(private readonly providers: ObservabilityProvider[]) {}

  capture(input: Omit<ObservabilityEvent, 'id' | 'timestamp' | 'environment' | 'release'>) {
    const event: ObservabilityEvent = {
      ...input,
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: new Date().toISOString(),
      environment: runtimeConfig.environment,
      release: runtimeConfig.release,
      message: input.message ? sanitizeText(input.message) : undefined,
      context: redactContext(input.context),
    };

    for (const provider of this.providers) {
      try {
        void provider.capture(event);
      } catch {
        // Observability darf die Anwendung niemals beschädigen.
      }
    }
    return event;
  }
}

export const inMemoryObservability = new InMemoryObservabilityProvider();
export const observability = new ObservabilityHub([
  inMemoryObservability,
  ...(runtimeConfig.developerToolsEnabled ? [new ConsoleObservabilityProvider()] : []),
]);

export function reportError(
  category: Exclude<ObservabilityCategory, 'performance'>,
  name: string,
  error: unknown,
  context?: Record<string, unknown>,
) {
  const normalized = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unbekannter Fehler');
  return observability.capture({
    category,
    level: 'error',
    name,
    message: normalized.message,
    context: { errorName: normalized.name, ...context },
  });
}

export function reportMetric(name: string, durationMs: number, context?: Record<string, unknown>) {
  return observability.capture({
    category: 'performance',
    level: durationMs > 2_500 ? 'warning' : 'info',
    name,
    durationMs: Math.max(0, Math.round(durationMs)),
    context,
  });
}

let globalMonitoringInstalled = false;

export function installGlobalErrorMonitoring() {
  if (globalMonitoringInstalled || typeof window === 'undefined') return () => undefined;
  globalMonitoringInstalled = true;

  const onError = (event: ErrorEvent) => {
    reportError('frontend', 'window.error', event.error ?? event.message, {
      filename: event.filename?.split('/').at(-1),
      line: event.lineno,
      column: event.colno,
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    reportError('frontend', 'window.unhandledrejection', event.reason);
  };
  const onOnline = () => observability.capture({ category: 'network', level: 'info', name: 'network.online' });
  const onOffline = () => observability.capture({ category: 'network', level: 'warning', name: 'network.offline' });

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    globalMonitoringInstalled = false;
  };
}
