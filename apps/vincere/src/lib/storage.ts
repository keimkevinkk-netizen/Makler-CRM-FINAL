import type { AppState } from '../types/domain';
import { LocalStorageWorkspaceRepository } from '../data/repository';

export const appRepository = new LocalStorageWorkspaceRepository();

export function loadState(): AppState {
  return appRepository.load();
}

export function saveState(state: AppState) {
  appRepository.save(state);
}

export function resetState() {
  appRepository.clear();
}

export function exportState(state: AppState) {
  return JSON.stringify(appRepository.exportSnapshot(state), null, 2);
}

export function importState(payload: string) {
  return appRepository.importSnapshot(payload);
}
