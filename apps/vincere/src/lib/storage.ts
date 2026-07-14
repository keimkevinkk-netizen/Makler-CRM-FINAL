import type { AppState } from '../types/domain';
import { runtimeConfig } from '../config/runtime';
import { createEmptyState, seedState } from '../data/seed';
import {
  LEGACY_STORAGE_KEY,
  LocalStorageWorkspaceRepository,
  WORKSPACE_STORAGE_KEY,
} from '../data/repository';

const isLegacyLocalDemo = runtimeConfig.environment === 'local' && runtimeConfig.dataMode === 'demo';
const storageNamespace = `${runtimeConfig.environment}_${runtimeConfig.dataMode}`;

export const appRepository = new LocalStorageWorkspaceRepository({
  storageKey: isLegacyLocalDemo ? WORKSPACE_STORAGE_KEY : `${WORKSPACE_STORAGE_KEY}_${storageNamespace}`,
  legacyStorageKey: LEGACY_STORAGE_KEY,
  fallbackState: runtimeConfig.mockDataEnabled ? seedState : createEmptyState(),
  allowLegacyMigration: isLegacyLocalDemo,
});

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

export function importState(payload: string, expectedWorkspaceId?: string) {
  return appRepository.importSnapshot(payload, expectedWorkspaceId);
}
