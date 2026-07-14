import { describe, expect, it, vi } from 'vitest';
import {
  REALTIME_TABLES,
  WorkspaceRealtimeManager,
  type RealtimeClientLike,
} from '../src/collaboration/realtimeManager';

class FakeChannel {
  handlers: Array<{ filter: { table: string; filter: string }; callback: (payload: never) => void }> = [];
  subscribeCallback?: (status: string, error?: Error) => void;

  on(_type: 'postgres_changes', filter: { table: string; filter: string }, callback: (payload: never) => void) {
    this.handlers.push({ filter, callback });
    return this;
  }

  subscribe(callback: (status: string, error?: Error) => void) {
    this.subscribeCallback = callback;
    callback('SUBSCRIBED');
    return this;
  }
}

function createFakeClient() {
  const channels: FakeChannel[] = [];
  const removed: FakeChannel[] = [];
  const client: RealtimeClientLike = {
    realtime: { setAuth: vi.fn() },
    channel: vi.fn(() => {
      const channel = new FakeChannel();
      channels.push(channel);
      return channel;
    }),
    removeChannel: vi.fn((channel: unknown) => { removed.push(channel as FakeChannel); }),
  };
  return { client, channels, removed };
}

const config = { url: 'https://example.supabase.co', publishableKey: 'publishable-test-key', configured: true };

describe('workspace-isolated Supabase realtime', () => {
  it('registers exactly the required tables with one workspace filter', async () => {
    const fake = createFakeClient();
    const manager = new WorkspaceRealtimeManager(config, () => fake.client);
    const changes: unknown[] = [];

    manager.start({
      workspaceId: 'workspace-a',
      userId: 'user-a',
      accessToken: 'access-token',
      onChange: (change) => changes.push(change),
      onStatus: vi.fn(),
    });
    await Promise.resolve();

    expect(fake.channels).toHaveLength(1);
    expect(fake.channels[0].handlers).toHaveLength(REALTIME_TABLES.length);
    expect(fake.channels[0].handlers.map((entry) => entry.filter.table)).toEqual(REALTIME_TABLES.map((entry) => entry.table));
    expect(fake.channels[0].handlers.every((entry) => entry.filter.filter === 'workspace_id=eq.workspace-a')).toBe(true);

    fake.channels[0].handlers[0].callback({
      eventType: 'UPDATE',
      new: { workspace_id: 'workspace-b', id: 'foreign-record', payload: {}, version: 2, updated_at: new Date().toISOString() },
      old: {},
    } as never);
    expect(changes).toHaveLength(0);
  });

  it('removes the previous channel on restart and all channels on stop', async () => {
    const fake = createFakeClient();
    const manager = new WorkspaceRealtimeManager(config, () => fake.client);
    const start = (workspaceId: string) => manager.start({
      workspaceId,
      userId: 'user-a',
      accessToken: 'access-token',
      onChange: vi.fn(),
      onStatus: vi.fn(),
    });

    start('workspace-a');
    await Promise.resolve();
    start('workspace-b');
    await Promise.resolve();

    expect(fake.channels).toHaveLength(2);
    expect(fake.removed).toContain(fake.channels[0]);
    expect(fake.channels[1].handlers.every((entry) => entry.filter.filter === 'workspace_id=eq.workspace-b')).toBe(true);

    manager.stop();
    expect(fake.removed).toContain(fake.channels[1]);
  });
});
