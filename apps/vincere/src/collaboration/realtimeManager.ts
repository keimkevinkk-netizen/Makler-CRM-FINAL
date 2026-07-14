import { createClient } from '@supabase/supabase-js';
import type { SupabaseRuntimeConfig } from '../config/runtime';
import type { CloudEntity, RemoteRecordChange, RealtimeCollectionKey } from '../data/cloudRepository';

export type RealtimeConnectionStatus = 'disabled' | 'connecting' | 'connected' | 'reconnecting' | 'offline' | 'error';

export interface RealtimeStatusUpdate {
  status: RealtimeConnectionStatus;
  workspaceId?: string;
  error?: string;
}

interface RealtimeRow {
  workspace_id?: string;
  id?: string;
  payload?: CloudEntity;
  version?: number;
  updated_at?: string;
  updated_by?: string | null;
}

interface PostgresPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: RealtimeRow;
  old: RealtimeRow;
}

interface ChannelLike {
  on(
    type: 'postgres_changes',
    filter: { event: '*'; schema: 'public'; table: string; filter: string },
    callback: (payload: PostgresPayload) => void,
  ): ChannelLike;
  subscribe(callback: (status: string, error?: Error) => void): ChannelLike;
}

export interface RealtimeClientLike {
  realtime: { setAuth: (accessToken: string) => Promise<void> | void };
  channel: (name: string) => ChannelLike;
  removeChannel: (channel: ChannelLike) => Promise<unknown> | unknown;
}

interface StartOptions {
  workspaceId: string;
  userId: string;
  accessToken: string;
  onChange: (change: RemoteRecordChange) => void;
  onStatus: (update: RealtimeStatusUpdate) => void;
}

export const REALTIME_TABLES: ReadonlyArray<{ collection: RealtimeCollectionKey; table: string }> = [
  { collection: 'contacts', table: 'contacts' },
  { collection: 'followUps', table: 'follow_ups' },
  { collection: 'properties', table: 'properties' },
  { collection: 'appointments', table: 'appointments' },
  { collection: 'callEvents', table: 'call_events' },
];

export const buildWorkspaceFilter = (workspaceId: string) => `workspace_id=eq.${workspaceId}`;

const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;
const browserWindow = () => typeof window === 'undefined' ? undefined : window;

function defaultClientFactory(config: SupabaseRuntimeConfig): RealtimeClientLike {
  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 10 } },
  }) as unknown as RealtimeClientLike;
}

export class WorkspaceRealtimeManager {
  private client: RealtimeClientLike | null = null;
  private channel: ChannelLike | null = null;
  private context: StartOptions | null = null;
  private generation = 0;
  private reconnectAttempt = 0;
  private reconnectTimer: number | undefined;
  private listenersAttached = false;

  constructor(
    private readonly config: SupabaseRuntimeConfig,
    private readonly clientFactory: (config: SupabaseRuntimeConfig) => RealtimeClientLike = defaultClientFactory,
  ) {}

  start(options: StartOptions) {
    this.stop();
    this.context = options;
    const generation = this.generation;

    if (!this.config.configured) {
      options.onStatus({ status: 'disabled' });
      return;
    }

    this.client = this.clientFactory(this.config);
    this.attachNetworkListeners();
    if (!online()) {
      options.onStatus({ status: 'offline', workspaceId: options.workspaceId, error: 'Keine Netzwerkverbindung.' });
      return;
    }
    void this.connect(generation);
  }

  reconnect() {
    if (!this.context || !this.config.configured) return;
    this.clearReconnectTimer();
    this.removeCurrentChannel();
    this.reconnectAttempt = 0;
    const generation = this.generation;
    if (!online()) {
      this.context.onStatus({ status: 'offline', workspaceId: this.context.workspaceId, error: 'Keine Netzwerkverbindung.' });
      return;
    }
    void this.connect(generation);
  }

  stop() {
    this.generation += 1;
    this.clearReconnectTimer();
    this.removeCurrentChannel();
    this.detachNetworkListeners();
    this.client = null;
    this.context = null;
    this.reconnectAttempt = 0;
  }

  private async connect(generation: number) {
    const context = this.context;
    const client = this.client;
    if (!context || !client || generation !== this.generation) return;

    context.onStatus({
      status: this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting',
      workspaceId: context.workspaceId,
    });

    try {
      await client.realtime.setAuth(context.accessToken);
      if (generation !== this.generation || context !== this.context) return;

      const channel = client.channel(`vincere:${context.workspaceId}:${context.userId}`);
      for (const definition of REALTIME_TABLES) {
        channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: definition.table,
            filter: buildWorkspaceFilter(context.workspaceId),
          },
          (payload) => {
            if (generation !== this.generation || context !== this.context) return;
            const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
            if (row.workspace_id !== context.workspaceId || !row.id) return;
            context.onChange({
              workspaceId: context.workspaceId,
              collection: definition.collection,
              eventType: payload.eventType,
              id: row.id,
              payload: row.payload,
              version: row.version ?? 0,
              updatedAt: row.updated_at ?? new Date().toISOString(),
              updatedBy: row.updated_by,
            });
          },
        );
      }

      this.channel = channel;
      channel.subscribe((status, error) => {
        if (generation !== this.generation || context !== this.context || this.channel !== channel) return;
        if (status === 'SUBSCRIBED') {
          this.reconnectAttempt = 0;
          context.onStatus({ status: 'connected', workspaceId: context.workspaceId });
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          this.scheduleReconnect(error?.message ?? `Realtime-Channel: ${status}`, generation);
        }
      });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Realtime-Verbindung konnte nicht aufgebaut werden.';
      this.scheduleReconnect(message, generation);
    }
  }

  private scheduleReconnect(message: string, generation: number) {
    const context = this.context;
    if (!context || generation !== this.generation) return;
    this.removeCurrentChannel();

    if (!online()) {
      context.onStatus({ status: 'offline', workspaceId: context.workspaceId, error: message });
      return;
    }

    this.reconnectAttempt += 1;
    const delay = Math.min(30_000, 1_000 * 2 ** Math.min(this.reconnectAttempt - 1, 5));
    context.onStatus({ status: 'reconnecting', workspaceId: context.workspaceId, error: message });
    this.clearReconnectTimer();
    this.reconnectTimer = browserWindow()?.setTimeout(() => void this.connect(generation), delay);
  }

  private removeCurrentChannel() {
    if (!this.client || !this.channel) return;
    const channel = this.channel;
    this.channel = null;
    void Promise.resolve(this.client.removeChannel(channel)).catch(() => undefined);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer === undefined) return;
    browserWindow()?.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }

  private attachNetworkListeners() {
    const target = browserWindow();
    if (!target || this.listenersAttached) return;
    target.addEventListener('online', this.handleOnline);
    target.addEventListener('offline', this.handleOffline);
    this.listenersAttached = true;
  }

  private detachNetworkListeners() {
    const target = browserWindow();
    if (!target || !this.listenersAttached) return;
    target.removeEventListener('online', this.handleOnline);
    target.removeEventListener('offline', this.handleOffline);
    this.listenersAttached = false;
  }

  private readonly handleOnline = () => this.reconnect();

  private readonly handleOffline = () => {
    this.clearReconnectTimer();
    this.removeCurrentChannel();
    if (this.context) {
      this.context.onStatus({
        status: 'offline',
        workspaceId: this.context.workspaceId,
        error: 'Keine Netzwerkverbindung. Lokale Änderungen bleiben erhalten.',
      });
    }
  };
}
