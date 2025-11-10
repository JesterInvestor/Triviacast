// Client-side helpers for Quests local gating (localStorage day flags)
const SHARE_KEY = 'triviacast:shareDoneDay';
const FOLLOW_KEY = 'triviacast:followDoneDay';

export function getToday(): number {
  return Math.floor(Date.now() / 1000 / 86400);
}

export function markShareDone(): void {
  try { localStorage.setItem(SHARE_KEY, String(getToday())); } catch {}
}

export function markFollowDone(): void {
  try { localStorage.setItem(FOLLOW_KEY, String(getToday())); } catch {}
}

export function getShareMarkedDay(): number | null {
  try { const v = localStorage.getItem(SHARE_KEY); return v ? parseInt(v, 10) : null; } catch { return null }
}

export function getFollowMarkedDay(): number | null {
  try { const v = localStorage.getItem(FOLLOW_KEY); return v ? parseInt(v, 10) : null } catch { return null }
}

export function isShareMarkedToday(): boolean {
  const d = getShareMarkedDay(); return d === getToday();
}

export function isFollowMarkedToday(): boolean {
  const d = getFollowMarkedDay(); return d === getToday();
}

// Helpers used by tests
export function clearQuestMarks(): void {
  try { localStorage.removeItem(SHARE_KEY); localStorage.removeItem(FOLLOW_KEY); } catch {}
}

export default {
  getToday,
  markShareDone,
  markFollowDone,
  getShareMarkedDay,
  getFollowMarkedDay,
  isShareMarkedToday,
  isFollowMarkedToday,
  clearQuestMarks,
};
