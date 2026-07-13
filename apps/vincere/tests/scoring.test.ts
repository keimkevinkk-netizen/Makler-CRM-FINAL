import { describe, expect, it } from 'vitest';
import { getNextBestActions, scoreFollowUp } from '../src/lib/scoring';
import { seedState } from '../src/data/seed';

const highPriority = seedState.followUps[0];
const contact = seedState.contacts.find((item) => item.id === highPriority.contactId);

describe('VINCERE next best action scoring', () => {
  it('scores high-priority overdue actions above zero', () => {
    expect(scoreFollowUp(highPriority, contact)).toBeGreaterThan(50);
  });

  it('returns actions in descending score order', () => {
    const actions = getNextBestActions(seedState);
    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].score).toBeGreaterThanOrEqual(actions.at(-1)?.score ?? 0);
  });
});
