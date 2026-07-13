import type { AppState } from '../types/domain';
import { seedState } from '../data/seed';

const STORAGE_KEY = 'vincere_state_v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState;
    return { ...seedState, ...JSON.parse(raw) } as AppState;
  } catch {
    return seedState;
  }
}

export function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}
