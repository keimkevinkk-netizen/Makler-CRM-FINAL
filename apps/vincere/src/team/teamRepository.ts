import type { CloudAuthSession } from '../auth/cloudAuth';
import type { SupabaseRuntimeConfig } from '../config/runtime';
import type { UserRole } from '../types/domain';

type FetchLike = typeof fetch;

export interface TeamMember {
  workspaceId: string;
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  disabledAt?: string | null;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
}

export interface CreatedInvitation extends WorkspaceInvitation {
  token: string;
}

interface MemberRow {
  workspace_id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  disabled_at: string | null;
}

interface InvitationRow {
  id: string;
  workspace_id: string;
  email: string;
  role: UserRole;
  expires_at: string;
  created_at: string;
  invited_by: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

interface CreatedInvitationRow extends InvitationRow {
  token: string;
}

export interface TeamDecision {
  allowed: boolean;
  reason?: string;
}

export const roleLabels: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  agent: 'Makler',
  viewer: 'Lesezugriff',
};

export const canManageTeam = (role: UserRole) => role === 'owner' || role === 'admin';

export function canChangeMemberRole(input: {
  actorRole: UserRole;
  actorUserId: string;
  targetUserId: string;
  targetRole: UserRole;
  nextRole: UserRole;
  activeOwnerCount: number;
}): TeamDecision {
  if (!canManageTeam(input.actorRole)) return { allowed: false, reason: 'Nur Owner und Administratoren dürfen Rollen ändern.' };
  if (input.actorRole === 'admin' && (input.targetRole === 'owner' || input.nextRole === 'owner')) {
    return { allowed: false, reason: 'Owner-Berechtigungen dürfen nur durch einen Owner verwaltet werden.' };
  }
  if (input.targetRole === 'owner' && input.nextRole !== 'owner' && input.activeOwnerCount <= 1) {
    return {
      allowed: false,
      reason: input.actorUserId === input.targetUserId
        ? 'Die eigene letzte Owner-Berechtigung kann nicht entfernt werden.'
        : 'Der letzte aktive Owner ist geschützt.',
    };
  }
  return { allowed: true };
}

export function canSetMemberActive(input: {
  actorRole: UserRole;
  actorUserId: string;
  targetUserId: string;
  targetRole: UserRole;
  nextActive: boolean;
  activeOwnerCount: number;
}): TeamDecision {
  if (!canManageTeam(input.actorRole)) return { allowed: false, reason: 'Nur Owner und Administratoren dürfen Mitglieder verwalten.' };
  if (input.actorRole === 'admin' && input.targetRole === 'owner') {
    return { allowed: false, reason: 'Owner dürfen nur durch einen Owner deaktiviert werden.' };
  }
  if (!input.nextActive && input.targetRole === 'owner' && input.activeOwnerCount <= 1) {
    return {
      allowed: false,
      reason: input.actorUserId === input.targetUserId
        ? 'Die eigene letzte Owner-Berechtigung kann nicht deaktiviert werden.'
        : 'Der letzte aktive Owner ist geschützt.',
    };
  }
  return { allowed: true };
}

function invitationStatus(row: InvitationRow): InvitationStatus {
  if (row.accepted_at) return 'accepted';
  if (row.revoked_at) return 'revoked';
  if (new Date(row.expires_at).getTime() <= Date.now()) return 'expired';
  return 'pending';
}

function mapMember(row: MemberRow): TeamMember {
  return {
    workspaceId: row.workspace_id,
    userId: row.user_id,
    displayName: row.display_name?.trim() || row.email || row.user_id,
    email: row.email ?? '',
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    disabledAt: row.disabled_at,
  };
}

function mapInvitation(row: InvitationRow): WorkspaceInvitation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
    status: invitationStatus(row),
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    invitedBy: row.invited_by,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
  };
}

async function readError(response: Response) {
  try {
    const data = await response.json() as { message?: string; details?: string; hint?: string };
    return data.message ?? data.details ?? data.hint ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export class SupabaseTeamRepository {
  constructor(
    private readonly config: SupabaseRuntimeConfig,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  private headers(session: CloudAuthSession) {
    return {
      apikey: this.config.publishableKey,
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async rpc<T>(name: string, body: Record<string, unknown>, session: CloudAuthSession): Promise<T> {
    if (!this.config.configured) throw new Error('Das VINCERE-Cloud-Backend ist nicht konfiguriert.');
    const response = await this.fetcher(`${this.config.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: this.headers(session),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await readError(response));
    return response.json() as Promise<T>;
  }

  async listMembers(workspaceId: string, session: CloudAuthSession) {
    const query = new URLSearchParams({
      select: 'workspace_id,user_id,display_name,email,role,is_active,created_at,disabled_at',
      workspace_id: `eq.${workspaceId}`,
      order: 'is_active.desc,created_at.asc',
    });
    const response = await this.fetcher(`${this.config.url}/rest/v1/workspace_members?${query}`, {
      headers: this.headers(session),
    });
    if (!response.ok) throw new Error(await readError(response));
    return (await response.json() as MemberRow[]).map(mapMember);
  }

  async listInvitations(workspaceId: string, session: CloudAuthSession) {
    const query = new URLSearchParams({
      select: 'id,workspace_id,email,role,expires_at,created_at,invited_by,accepted_at,revoked_at',
      workspace_id: `eq.${workspaceId}`,
      order: 'created_at.desc',
    });
    const response = await this.fetcher(`${this.config.url}/rest/v1/workspace_invitations?${query}`, {
      headers: this.headers(session),
    });
    if (!response.ok) throw new Error(await readError(response));
    return (await response.json() as InvitationRow[]).map(mapInvitation);
  }

  async createInvitation(input: {
    workspaceId: string;
    email: string;
    role: UserRole;
    expiresHours: number;
  }, session: CloudAuthSession): Promise<CreatedInvitation> {
    const result = await this.rpc<CreatedInvitationRow[] | CreatedInvitationRow>('create_workspace_invitation', {
      p_workspace_id: input.workspaceId,
      p_email: input.email.trim().toLowerCase(),
      p_role: input.role,
      p_expires_hours: input.expiresHours,
    }, session);
    const row = Array.isArray(result) ? result[0] : result;
    if (!row?.token) throw new Error('Das Einladungstoken wurde nicht erzeugt.');
    return { ...mapInvitation(row), token: row.token };
  }

  async changeRole(workspaceId: string, userId: string, role: UserRole, session: CloudAuthSession) {
    await this.rpc('change_workspace_member_role', {
      p_workspace_id: workspaceId,
      p_target_user_id: userId,
      p_role: role,
    }, session);
  }

  async setMemberActive(workspaceId: string, userId: string, active: boolean, session: CloudAuthSession) {
    await this.rpc('set_workspace_member_active', {
      p_workspace_id: workspaceId,
      p_target_user_id: userId,
      p_active: active,
    }, session);
  }

  async revokeInvitation(workspaceId: string, invitationId: string, session: CloudAuthSession) {
    await this.rpc('revoke_workspace_invitation', {
      p_workspace_id: workspaceId,
      p_invitation_id: invitationId,
    }, session);
  }
}
