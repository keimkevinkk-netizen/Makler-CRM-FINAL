import type { UserRole } from '../types/domain';
import type { SupabaseRuntimeConfig } from '../config/runtime';
import { reportError } from '../observability/observability';

export interface CloudAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string;
}

export interface WorkspaceMembership {
  workspaceId: string;
  role: UserRole;
  displayName: string;
}

interface SupabaseTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
}

interface MembershipRow {
  workspace_id: string;
  role: UserRole;
  display_name: string | null;
}

const AUTH_STORAGE_KEY = 'vincere_auth_session_v1';
const REFRESH_BUFFER_MS = 60_000;

type FetchLike = typeof fetch;

function assertConfigured(config: SupabaseRuntimeConfig): asserts config is SupabaseRuntimeConfig & { configured: true } {
  if (!config.configured) throw new Error('Das VINCERE-Cloud-Backend ist nicht konfiguriert.');
}

async function readError(response: Response) {
  try {
    const data = await response.json() as { msg?: string; message?: string; error_description?: string; error?: string };
    return data.error_description ?? data.msg ?? data.message ?? data.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export class SupabaseRestAuthClient {
  constructor(
    private readonly config: SupabaseRuntimeConfig,
    private readonly storage: Storage = sessionStorage,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  private headers(accessToken?: string) {
    return {
      apikey: this.config.publishableKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  }

  private persist(session: CloudAuthSession | null) {
    if (session) this.storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    else this.storage.removeItem(AUTH_STORAGE_KEY);
  }

  private toSession(data: SupabaseTokenResponse): CloudAuthSession {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      userId: data.user.id,
      email: data.user.email ?? '',
    };
  }

  async signIn(email: string, password: string) {
    assertConfigured(this.config);
    const response = await this.fetcher(`${this.config.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email: email.trim(), password }),
      cache: 'no-store',
    });
    if (!response.ok) {
      const message = await readError(response);
      reportError('auth', 'auth.sign-in', new Error(message), { httpStatus: response.status });
      throw new Error(message);
    }
    const session = this.toSession(await response.json() as SupabaseTokenResponse);
    this.persist(session);
    return session;
  }

  async refreshSession(session: CloudAuthSession) {
    assertConfigured(this.config);
    const response = await this.fetcher(`${this.config.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ refresh_token: session.refreshToken }),
      cache: 'no-store',
    });
    if (!response.ok) {
      this.persist(null);
      const message = await readError(response);
      reportError('auth', 'auth.refresh', new Error(message), { httpStatus: response.status });
      throw new Error(message);
    }
    const refreshed = this.toSession(await response.json() as SupabaseTokenResponse);
    this.persist(refreshed);
    return refreshed;
  }

  async restoreSession() {
    if (!this.config.configured) return null;
    const raw = this.storage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as CloudAuthSession;
      if (!session.accessToken || !session.refreshToken || !session.userId || !Number.isFinite(session.expiresAt)) throw new Error('invalid');
      if (session.expiresAt - Date.now() <= REFRESH_BUFFER_MS) return await this.refreshSession(session);
      return session;
    } catch {
      this.persist(null);
      return null;
    }
  }

  async signOut(session: CloudAuthSession | null) {
    if (this.config.configured && session?.accessToken) {
      await this.fetcher(`${this.config.url}/auth/v1/logout`, {
        method: 'POST',
        headers: this.headers(session.accessToken),
        cache: 'no-store',
      }).catch((reason: unknown) => {
        reportError('auth', 'auth.sign-out-network', reason);
      });
    }
    this.persist(null);
  }

  async getMembership(session: CloudAuthSession): Promise<WorkspaceMembership> {
    assertConfigured(this.config);
    const query = new URLSearchParams({
      select: 'workspace_id,role,display_name',
      user_id: `eq.${session.userId}`,
      limit: '1',
    });
    const response = await this.fetcher(`${this.config.url}/rest/v1/workspace_members?${query}`, {
      headers: this.headers(session.accessToken),
      cache: 'no-store',
    });
    if (!response.ok) {
      const message = await readError(response);
      reportError('auth', 'auth.membership', new Error(message), { httpStatus: response.status });
      throw new Error(message);
    }
    const rows = await response.json() as MembershipRow[];
    const row = rows[0];
    if (!row) throw new Error('Für dieses Benutzerkonto wurde kein VINCERE-Workspace freigeschaltet.');
    return {
      workspaceId: row.workspace_id,
      role: row.role,
      displayName: row.display_name?.trim() || session.email,
    };
  }
}
