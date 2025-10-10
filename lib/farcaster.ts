// Simple helpers to build Farcaster (Warpcast) share URLs with prefilled text and embeds
// We prefer client-origin when available; fallback to production URL.

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  // Fallback to production domain
  return 'https://triviacast.xyz';
}

function buildEmbedsParams(embeds: string[] = []): string {
  if (!embeds.length) return '';
  // Warpcast supports multiple embeds[] params: embeds[]=url1&embeds[]=url2
  return embeds
    .map((u) => `embeds[]=${encodeURIComponent(u)}`)
    .join('&');
}

export function buildWarpcastShareUrl(text: string, embeds?: string[]): string {
  const base = 'https://warpcast.com/~/compose';
  const textParam = `text=${encodeURIComponent(text)}`;
  const embedsParam = buildEmbedsParams(embeds || []);
  return embedsParam ? `${base}?${textParam}&${embedsParam}` : `${base}?${textParam}`;
}

// Convenience builders
export function shareAppText(): string {
  const url = getBaseUrl();
  return `Play Triviacast and earn T Points! 🧠\n${url}\n#Triviacast #Trivia #Farcaster`;
}

export function shareAppUrl(): string {
  const url = getBaseUrl();
  return buildWarpcastShareUrl(shareAppText(), [url]);
}

export function shareResultsText(score: number, total: number, percent: number, tPoints: number): string {
  const url = getBaseUrl();
  const points = tPoints.toLocaleString();
  return `I scored ${score}/${total} (${percent}%) on Triviacast and earned ${points} T Points! 🏆\nPlay now: ${url}\n#Triviacast #Trivia #Farcaster`;
}

export function shareResultsUrl(score: number, total: number, percent: number, tPoints: number): string {
  const url = getBaseUrl();
  return buildWarpcastShareUrl(shareResultsText(score, total, percent, tPoints), [url]);
}

export function shareLeaderboardText(rank: number | null, points: number): string {
  const site = getBaseUrl();
  const pts = points.toLocaleString();
  if (rank !== null) {
    return `I'm #${rank} on the Triviacast leaderboard with ${pts} T Points! 🏆\nSee the leaderboard: ${site}/leaderboard\n#Triviacast #Trivia #Farcaster`;
  }
  return `I'm climbing the Triviacast leaderboard with ${pts} T Points! 🧠\nSee the leaderboard: ${site}/leaderboard\n#Triviacast #Trivia #Farcaster`;
}

export function shareLeaderboardUrl(rank: number | null, points: number): string {
  const site = getBaseUrl();
  return buildWarpcastShareUrl(shareLeaderboardText(rank, points), [`${site}/leaderboard`]);
}
