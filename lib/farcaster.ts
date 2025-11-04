// Simple helpers to build Farcaster (Warpcast) share URLs with prefilled text and embeds
// Always use the canonical URL for share links.

function getBaseUrl(): string {
  // Always return the canonical URL for share links
  return 'https://triviacast.xyz';
}

// Helper to detect if text contains mentions/tagged friends
function hasTaggedFriends(text: string): boolean {
  // Check for Farcaster mentions: @username or @username.eth or @username.farcaster.eth
  // Must be at start of text, after whitespace, or after newline to avoid matching emails
  const mentionPattern = /(^|\s)@[\w-]+(?:\.(?:eth|farcaster\.eth))?/;
  return mentionPattern.test(text);
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
      // Note: If the URL was built without embeds (due to tagged friends), embeds will be empty
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

export function buildWarpcastShareUrl(text: string, embeds?: string[], options?: { action?: 'cast' | 'share' }): string {
  const base = 'https://warpcast.com/~/compose';
  const textParam = `text=${encodeURIComponent(text)}`;
  
  // When composing a cast (not a share) with tagged friends, do not include embeds
  // This prevents the large share preview from being added automatically
  const action = options?.action || 'cast';
  const shouldIncludeEmbeds = action === 'share' || !hasTaggedFriends(text);
  
  const embedsParam = shouldIncludeEmbeds ? buildEmbedsParams(embeds || []) : '';
  return embedsParam ? `${base}?${textParam}&${embedsParam}` : `${base}?${textParam}`;
}

// Build a share URL that works for both Farcaster and Base
export function buildPlatformShareUrl(text: string, embeds?: string[], options?: { action?: 'cast' | 'share' }): string {
  const platform = getPlatform();
  const action = options?.action || 'cast';
  
  // When composing a cast (not a share) with tagged friends, do not include embeds
  const shouldIncludeEmbeds = action === 'share' || !hasTaggedFriends(text);
  
  // For Base and Farcaster, return the app URL directly (first embed if available).
  // This ensures mini app hosts receive the canonical HTTPS link and can open the
  // app/share extension the same way Base does.
  if (platform === 'base' || platform === 'farcaster') {
    if (shouldIncludeEmbeds && embeds && embeds.length > 0) {
      return embeds[0];
    }
    return getBaseUrl();
  }
  
  // For web, use Warpcast compose URL (opens Warpcast composer on the web)
  return buildWarpcastShareUrl(text, embeds, options);
}

// Convenience builders
export function shareAppText(): string {
  const url = getBaseUrl();
  return `Play Triviacast and earn T Points! 🧠\n${url}\n#Triviacast #Trivia #Farcaster`;
}

export function shareAppUrl(): string {
  const url = getBaseUrl();
  return buildPlatformShareUrl(shareAppText(), [url], { action: 'share' });
}

export function shareResultsText(score: number, total: number, percent: number, tPoints: number, username?: string): string {
  const url = getBaseUrl();
  const points = tPoints.toLocaleString();
  
  // Build mention prefix if username is provided
  const mentionPrefix = username ? `@${username.startsWith('@') ? username.slice(1) : username}.farcaster.eth ` : '';
  
  // Simplified message format as per requirements
  return `${mentionPrefix}I scored ${score} (${points} T Points) on the Triviacast Challenge — beat my score! Play it: ${url}`;
}

export function shareResultsUrl(score: number, total: number, percent: number, tPoints: number, username?: string): string {
  const text = shareResultsText(score, total, percent, tPoints, username);
  // When tagging friends with mentions, don't include embeds to avoid large preview
  // The buildPlatformShareUrl function already handles this via hasTaggedFriends check
  const url = getBaseUrl();
  return buildPlatformShareUrl(text, [url], { action: 'cast' });
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
  return buildPlatformShareUrl(shareLeaderboardText(rank, points), [`${site}/leaderboard`], { action: 'share' });
}
