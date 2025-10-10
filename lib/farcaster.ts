// Simple helpers to build Farcaster (Warpcast) share URLs with prefilled text and embeds
// We prefer client-origin when available; fallback to production URL.

function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  // Fallback to production domain
  return 'https://triviacast.xyz';
}

// Helper to open share URL properly within mini app or externally
export async function openShareUrl(url: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // Try to use Farcaster SDK if available (running in mini app)
    const { sdk } = await import('@farcaster/miniapp-sdk');
    // Use SDK's openUrl to handle the URL within the Farcaster client
    await sdk.actions.openUrl(url);
    return;
  } catch (error) {
    // SDK not available or failed to load - fall through to normal handling
    console.log('Farcaster SDK not available, using normal link');
  }
  
  // Fallback to normal window.open for non-mini-app contexts
  window.open(url, '_blank', 'noopener,noreferrer');
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
  if (rank !== null) {
    return `I'm #${rank} on the Triviacast leaderboard! 🏆\nCheck it out: ${site}/leaderboard\n#Triviacast #Trivia #Farcaster`;
  }
  return `Check out the Triviacast leaderboard! 🧠\n${site}/leaderboard\n#Triviacast #Trivia #Farcaster`;
}

export function shareLeaderboardUrl(rank: number | null, points: number): string {
  const site = getBaseUrl();
  return buildWarpcastShareUrl(shareLeaderboardText(rank, points), [`${site}/leaderboard`]);
}
