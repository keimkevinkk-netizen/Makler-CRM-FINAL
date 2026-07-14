import type { SafeJsonObject } from './types';

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DEPTH = 80;
const MAX_NODES = 250_000;

export class LegacyImportSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LegacyImportSecurityError';
  }
}

export function isSafeObject(value: unknown): value is SafeJsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function validateTree(root: unknown) {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
  let nodes = 0;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;
    nodes += 1;
    if (nodes > MAX_NODES) throw new LegacyImportSecurityError('Die JSON-Datei enthält zu viele verschachtelte Werte.');
    if (current.depth > MAX_DEPTH) throw new LegacyImportSecurityError('Die JSON-Datei ist zu tief verschachtelt.');

    if (Array.isArray(current.value)) {
      for (const item of current.value) stack.push({ value: item, depth: current.depth + 1 });
      continue;
    }

    if (!isSafeObject(current.value)) continue;
    for (const [key, item] of Object.entries(current.value)) {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new LegacyImportSecurityError(`Unsicherer JSON-Schlüssel wurde blockiert: ${key}`);
      }
      stack.push({ value: item, depth: current.depth + 1 });
    }
  }
}

export function parseSafeJson(payload: string): unknown {
  if (!payload.trim()) throw new LegacyImportSecurityError('Die ausgewählte Datei ist leer.');
  if (byteLength(payload) > MAX_FILE_BYTES) throw new LegacyImportSecurityError('Die Importdatei überschreitet das Limit von 25 MB.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload, (key, value: unknown) => {
      if (FORBIDDEN_KEYS.has(key)) {
        throw new LegacyImportSecurityError(`Unsicherer JSON-Schlüssel wurde blockiert: ${key}`);
      }
      return value;
    });
  } catch (error) {
    if (error instanceof LegacyImportSecurityError) throw error;
    throw new LegacyImportSecurityError('Die Datei enthält kein gültiges JSON.');
  }

  validateTree(parsed);
  return parsed;
}

export function parseNestedJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed || (!trimmed.startsWith('[') && !trimmed.startsWith('{'))) return value;
  return parseSafeJson(trimmed);
}
