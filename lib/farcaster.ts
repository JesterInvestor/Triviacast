// Simple helpers to build Farcaster (Warpcast) share URLs with prefilled text and embeds
// Always use the canonical URL for share links.

function getBaseUrl(): string {
  // Always return the canonical URL for share links
  return 'https://triviacast.xyz';
}

// Detect which platform we're running on
function getPlatform(): 'farcaster' | 'base' | 'web' {
  if (typeof window === 'undefined') return 'web';
  
  // Check for Farcaster miniapp SDK
  try {
    // Try to detect Farcaster context
    const ethereum = (window as any).ethereum;
    if (ethereum?.isFarcaster || ethereum?.isMiniApp) {
      return 'farcaster';
    }
  } catch (e) {
    // ignore
  }
  
  // Check if we're in Base wallet by checking the connector
  try {
    // Check sessionStorage for connector info
    const connector = sessionStorage.getItem('wagmi.connector');
    // Match Base-specific connector ID more precisely
    if (connector && (connector === '"base"' || connector.includes('"id":"base"'))) {
      return 'base';
    }
  } catch (e) {
    // ignore
  }
  
  return 'web';
}

// Helper to open share URL properly within mini app or externally
export async function openShareUrl(url: string): Promise<void> {
  if (typeof window === 'undefined') return;
  
  const platform = getPlatform();
  
  // Always try to use Farcaster SDK first (works in miniapp and desktop app)
  try {
    const { sdk } = await import('@farcaster/miniapp-sdk');
    
    // Check if SDK context is available (indicates we're in a Farcaster environment)
    const context = await sdk.context;
    if (context) {
      // Parse the Warpcast compose URL to extract text and embeds
      const urlObj = new URL(url);
      const text = urlObj.searchParams.get('text') || '';
      const embeds: string[] = [];
      
      // Extract embeds (Warpcast uses embeds[] param)
      urlObj.searchParams.forEach((value, key) => {
        if (key === 'embeds[]' && embeds.length < 2) {
          embeds.push(value);
        }
      });
      
      // Format embeds for composeCast (undefined, [string], or [string, string])
      const formattedEmbeds = embeds.length > 0 
        ? (embeds.slice(0, 2) as [] | [string] | [string, string])
        : undefined;
      
      // Use composeCast to directly open the cast composer in Farcaster
      await sdk.actions.composeCast({
        text,
        embeds: formattedEmbeds,
      });
      return;
    }
  } catch (error) {
    // SDK not available or failed - fall through to other methods
    console.log('Farcaster SDK not available or composeCast failed, using fallback', error);
  }
  
  // For Base or Farcaster miniapp, open the app URL directly instead of Warpcast compose
  if (platform === 'base' || platform === 'farcaster') {
    // Extract the app URL from the Warpcast compose URL if it contains embeds
    // Handle both URL-encoded (%5B%5D) and regular ([]) square brackets
    const match = url.match(/embeds(?:%5B%5D|\[\])=([^&]+)/);
    if (match) {
      const appUrl = decodeURIComponent(match[1]);
      window.open(appUrl, '_blank', 'noopener,noreferrer');
      return;
    }
  }
  
  // Fallback to normal window.open for web contexts
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

// Build a share URL that works for both Farcaster and Base
export function buildPlatformShareUrl(text: string, embeds?: string[]): string {
  const platform = getPlatform();
  
  // For Base and Farcaster, return the app URL directly (first embed if available).
  // This ensures mini app hosts receive the canonical HTTPS link and can open the
  // app/share extension the same way Base does.
  if (platform === 'base' || platform === 'farcaster') {
    if (embeds && embeds.length > 0) {
      return embeds[0];
    }
    return getBaseUrl();
  }
  
  // For web, use Warpcast compose URL (opens Warpcast composer on the web)
  return buildWarpcastShareUrl(text, embeds);
}

// Convenience builders
export function shareAppText(): string {
  const url = getBaseUrl();
  return `Play Triviacast and earn T Points! 🧠\n${url}\n#Triviacast #Trivia #Farcaster`;
}

export function shareAppUrl(): string {
  const url = getBaseUrl();
  return buildPlatformShareUrl(shareAppText(), [url]);
}

export function shareResultsText(score: number, total: number, percent: number, tPoints: number): string {
  const url = getBaseUrl();
  const points = tPoints.toLocaleString();
  return `I scored ${score}/${total} (${percent}%) on Triviacast and earned ${points} T Points! 🏆\nPlay now: ${url}\n#Triviacast #Trivia #Farcaster`;
}

export function shareResultsUrl(score: number, total: number, percent: number, tPoints: number): string {
  const url = getBaseUrl();
  return buildPlatformShareUrl(shareResultsText(score, total, percent, tPoints), [url]);
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
  return buildPlatformShareUrl(shareLeaderboardText(rank, points), [`${site}/leaderboard`]);
}
