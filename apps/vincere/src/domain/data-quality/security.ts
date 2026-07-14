import type { DataQualityInput } from './types';

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_DEPTH = 50;
const MAX_NODES = 500_000;

export class DataQualitySecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataQualitySecurityError';
  }
}

export function assertSafeDataQualityInput(input: DataQualityInput): void {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: input, depth: 0 }];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    nodes += 1;
    if (nodes > MAX_NODES) throw new DataQualitySecurityError('Die Qualitätsprüfung wurde wegen einer übergroßen Datenstruktur abgebrochen.');
    if (current.depth > MAX_DEPTH) throw new DataQualitySecurityError('Die Qualitätsprüfung wurde wegen einer zu tief verschachtelten Datenstruktur abgebrochen.');
    if (Array.isArray(current.value)) {
      for (const item of current.value) stack.push({ value: item, depth: current.depth + 1 });
      continue;
    }
    if (current.value === null || typeof current.value !== 'object') continue;
    const prototype = Object.getPrototypeOf(current.value);
    if (prototype !== Object.prototype && prototype !== null) throw new DataQualitySecurityError('Nicht unterstützte Objektstruktur in der Qualitätsprüfung.');
    for (const [key, value] of Object.entries(current.value)) {
      if (FORBIDDEN_KEYS.has(key)) throw new DataQualitySecurityError(`Unsicherer Schlüssel wurde blockiert: ${key}`);
      stack.push({ value, depth: current.depth + 1 });
    }
  }
}
