import { describe, expect, it } from 'vitest';
import { getAvailableCommands, searchCommands } from './commandRegistry';

describe('command registry permissions', () => {
  it('does not expose write commands to viewers', () => {
    const ids = getAvailableCommands('viewer').map((command) => command.id);
    expect(ids).not.toContain('new-contact');
    expect(ids).not.toContain('call-contact');
    expect(ids).not.toContain('create-followup');
    expect(ids).toContain('open-pipeline');
    expect(ids).toContain('open-settings');
  });

  it('finds commands by prefixes and aliases', () => {
    expect(searchCommands('owner', 'bewert')[0].id).toBe('open-valuation');
    expect(searchCommands('owner', 'tagesfokus')[0].id).toBe('start-daily-focus');
  });
});
