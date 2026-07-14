export interface MobileIdentity {
  workspaceId: string;
  actorId: string;
}

export function createMobileIdentityKey(identity?: MobileIdentity) {
  return identity ? `${identity.workspaceId}:${identity.actorId}` : undefined;
}

export function shouldPurgeTemporaryState(
  previousIdentityKey: string | undefined,
  nextIdentityKey: string | undefined,
) {
  return previousIdentityKey !== nextIdentityKey;
}
