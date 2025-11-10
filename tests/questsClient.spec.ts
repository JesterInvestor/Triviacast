import { describe, it, expect, beforeEach } from 'vitest';
import {
  getToday,
  markShareDone,
  markFollowDone,
  getShareMarkedDay,
  getFollowMarkedDay,
  isShareMarkedToday,
  isFollowMarkedToday,
  clearQuestMarks,
} from '../lib/questsClient';

describe('questsClient localStorage helpers', () => {
  beforeEach(() => {
    // Provide a simple in-memory localStorage for the test environment
    const store: Record<string, string> = {};
    // @ts-ignore - define on global for test
    globalThis.localStorage = {
      getItem: (k: string) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
    } as any;

    clearQuestMarks();
  });

  it('marks share done for today', () => {
    expect(getShareMarkedDay()).toBeNull();
    markShareDone();
    const today = getToday();
    expect(getShareMarkedDay()).toBe(today);
    expect(isShareMarkedToday()).toBe(true);
  });

  it('marks follow done for today', () => {
    expect(getFollowMarkedDay()).toBeNull();
    markFollowDone();
    const today = getToday();
    expect(getFollowMarkedDay()).toBe(today);
    expect(isFollowMarkedToday()).toBe(true);
  });
});
