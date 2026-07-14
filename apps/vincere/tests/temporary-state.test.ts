import { describe, expect, it } from 'vitest';
import { createMobileIdentityKey, shouldPurgeTemporaryState } from '../src/pwa/temporaryState';

describe('temporary mobile state identity guard', () => {
  it('keeps temporary state for the same workspace and user', () => {
    const identity = createMobileIdentityKey({ workspaceId: 'workspace-a', actorId: 'user-a' });

    expect(shouldPurgeTemporaryState(identity, identity)).toBe(false);
  });

  it('purges temporary state on workspace switch', () => {
    const previous = createMobileIdentityKey({ workspaceId: 'workspace-a', actorId: 'user-a' });
    const next = createMobileIdentityKey({ workspaceId: 'workspace-b', actorId: 'user-a' });

    expect(shouldPurgeTemporaryState(previous, next)).toBe(true);
  });

  it('purges temporary state on user switch', () => {
    const previous = createMobileIdentityKey({ workspaceId: 'workspace-a', actorId: 'user-a' });
    const next = createMobileIdentityKey({ workspaceId: 'workspace-a', actorId: 'user-b' });

    expect(shouldPurgeTemporaryState(previous, next)).toBe(true);
  });

  it('purges temporary state on logout', () => {
    const previous = createMobileIdentityKey({ workspaceId: 'workspace-a', actorId: 'user-a' });

    expect(shouldPurgeTemporaryState(previous, undefined)).toBe(true);
  });
});
