import type { UserRole, WorkspaceUser } from '../types/domain';

export type Permission =
  | 'contacts:read'
  | 'contacts:write'
  | 'followups:write'
  | 'pipeline:write'
  | 'properties:write'
  | 'calls:write'
  | 'workspace:manage'
  | 'backup:manage';

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  owner: new Set<Permission>([
    'contacts:read',
    'contacts:write',
    'followups:write',
    'pipeline:write',
    'properties:write',
    'calls:write',
    'workspace:manage',
    'backup:manage',
  ]),
  admin: new Set<Permission>([
    'contacts:read',
    'contacts:write',
    'followups:write',
    'pipeline:write',
    'properties:write',
    'calls:write',
    'workspace:manage',
    'backup:manage',
  ]),
  agent: new Set<Permission>([
    'contacts:read',
    'contacts:write',
    'followups:write',
    'pipeline:write',
    'properties:write',
    'calls:write',
  ]),
  viewer: new Set<Permission>(['contacts:read']),
};

export function can(user: WorkspaceUser, permission: Permission) {
  return rolePermissions[user.role].has(permission);
}

export function assertPermission(user: WorkspaceUser, permission: Permission) {
  if (!can(user, permission)) {
    throw new Error(`Fehlende Berechtigung: ${permission}`);
  }
}
