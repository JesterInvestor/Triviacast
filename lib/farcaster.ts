// Simple helpers to build Farcaster (Warpcast) share URLs with prefilled text and embeds
// Always use the canonical URL for share links.

function getBaseUrl(): string {
  // Always return the canonical URL for share links
  return 'https://triviacast.xyz';
}

// Helper to detect if text contains mentions/tagged friends
function hasTaggedFriends(text: string): boolean {
  // Detect simple @username mentions (treats @username, @username.eth, or @username.farcaster.eth
  // as mentioning the same username). Keep the match anchored to start/whitespace to avoid
  // accidentally matching emails.
  const mentionPattern = /(^|\s)@[\w-]+/;
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
    const { error: logError } = await import('./logger');
    logError(error, { context: 'openShareUrl.composeCastFallback' });
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
  // A few punchy variants to keep casts feeling fresh
  const variants = [
    (u: string) => `I’m playing Triviacast — daily crypto + pop culture trivia! 🧠⚡\nJump in: ${u}\n#Triviacast #Trivia #Farcaster`,
    (u: string) => `Got brain power? Prove it on Triviacast and rack up T Points. 🏆\nPlay now → ${u}\n#Triviacast #Onchain`,
    (u: string) => `Snackable trivia, real onchain flex. 🧠✨ Earn T Points and climb the board.\nStart here: ${u} #Triviacast`
  ];
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return pick(variants)(url);
}

export function shareAppUrl(): string {
  const url = getBaseUrl();
  return buildPlatformShareUrl(shareAppText(), [url], { action: 'share' });
}

export function shareResultsText(score: number, total: number, percent: number, tPoints: number): string {
  const url = getBaseUrl();
  const points = tPoints.toLocaleString();
  // Add a fun flair based on performance
  const flair = percent === 100
    ? 'PERFECT RUN 🔥'
    : percent >= 80
    ? 'On a hot streak 💥'
    : percent >= 60
    ? 'Locked in 🎯'
    : 'Come take my crown? 👑';
  const variants = [
    (u: string) => `${flair} — ${score}/${total} (${percent}%) on Triviacast and banked ${points} T Points! 🧠\nBeat me: ${u} #Triviacast`,
    (u: string) => `Just finished Triviacast: ${score}/${total} (${percent}%) • +${points} T Points 🏆\nThink you can top that? ${u} #Trivia`,
    (u: string) => `${score}/${total} correct (${percent}%) on Triviacast. +${points} T Points.\nYour turn → ${u} 🧠`
  ];
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return pick(variants)(url);
}

export function shareResultsUrl(score: number, total: number, percent: number, tPoints: number): string {
  const url = getBaseUrl();
  return buildPlatformShareUrl(shareResultsText(score, total, percent, tPoints), [url], { action: 'share' });
}

export function shareLeaderboardText(rank: number | null, points: number): string {
  const site = getBaseUrl();
  if (rank !== null) {
    const pts = points.toLocaleString();
    const variants = [
      (u: string) => `I’m #${rank} on the Triviacast leaderboard with ${pts} T Points 🏆\nCatch me if you can → ${u}/leaderboard #Triviacast`,
      (u: string) => `Climbing the Triviacast ranks: #${rank} • ${pts} T Points 🚀\nSee the board: ${u}/leaderboard`,
      (u: string) => `Brain power check: currently #${rank} on Triviacast 🧠\nLeaderboard → ${u}/leaderboard`
    ];
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    return pick(variants)(site);
  }
  const variants = [
    (u: string) => `Who’s on top? 🧠 Triviacast leaderboard is live.\n${u}/leaderboard #Triviacast`,
    (u: string) => `Leaderboard time! 🏁 See today’s brainiacs → ${u}/leaderboard`,
    (u: string) => `Climb the Triviacast leaderboard and flex those T Points. 🧗\n${u}/leaderboard`
  ];
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return pick(variants)(site);
}

export function shareLeaderboardUrl(rank: number | null, points: number): string {
  const site = getBaseUrl();
  return buildPlatformShareUrl(shareLeaderboardText(rank, points), [`${site}/leaderboard`], { action: 'share' });
}

// Open a Farcaster profile (username like 'jesterinvestor') using the best available method:
// 1) Try any injected or imported Farcaster miniapp SDK actions (openUrl/open/etc.)
// 2) Try postMessage fallbacks to parent
// 3) Finally fallback to window.open
export async function openFarcasterProfile(username: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const url = `https://farcaster.xyz/${username}`;

  // Try known global SDKs first
  try {
    const w = window as any;
    const candidates = [w.sdk, w.farcasterSdk, w.farcasterMiniApp, w.__farcasterMiniApp, w.FarcasterMiniApp, w];
    for (const c of candidates) {
      if (!c) continue;
      try {
        const maybeSdk = c.sdk ? c.sdk : c;
        if (maybeSdk && maybeSdk.actions) {
          if (typeof maybeSdk.actions.openUrl === 'function') {
            void maybeSdk.actions.openUrl({ url });
            return;
          }
          if (typeof maybeSdk.actions.open === 'function') {
            void maybeSdk.actions.open({ url });
            return;
          }
          if (typeof maybeSdk.actions.openMiniApp === 'function') {
            void maybeSdk.actions.openMiniApp({ url });
            return;
          }
          if (typeof maybeSdk.actions.launchMiniApp === 'function') {
            void maybeSdk.actions.launchMiniApp({ url });
            return;
          }
        }
      } catch (err) {
        // ignore and try next candidate
      }
    }
  } catch (err) {
    // ignore
  }

  // Try dynamic import of the SDK as a next option
  try {
    const importPromise = import('@farcaster/miniapp-sdk').catch(() => null);
    const mod = await Promise.race([importPromise, new Promise((res) => setTimeout(() => res(null), 600))]);
    if (mod) {
      const maybeSdk = (mod as any)?.sdk ?? (mod as any)?.default?.sdk ?? (mod as any)?.default ?? mod;
      if (maybeSdk && maybeSdk.actions) {
        if (typeof maybeSdk.actions.openUrl === 'function') {
          void maybeSdk.actions.openUrl({ url });
          return;
        }
        if (typeof maybeSdk.actions.open === 'function') {
          void maybeSdk.actions.open({ url });
          return;
        }
        if (typeof maybeSdk.actions.openMiniApp === 'function') {
          void maybeSdk.actions.openMiniApp({ url });
          return;
        }
        if (typeof maybeSdk.actions.launchMiniApp === 'function') {
          void maybeSdk.actions.launchMiniApp({ url });
          return;
        }
      }
    }
  } catch (err) {
    // ignore import failures
  }

  // Try postMessage fallbacks to parent
  try {
    if (window.parent && window.parent !== window) {
      const msgs = [
        { type: 'open_url', url },
        { type: 'open', url },
        { type: 'openUrl', url },
        { type: 'miniapp:open', url },
        { type: 'miniapp:action', action: { type: 'open_url', url } },
      ];
      for (const m of msgs) {
        try {
          window.parent.postMessage(m, '*');
        } catch (err) {
          // ignore
        }
      }
      // give host a brief moment to handle the message
      await new Promise((res) => setTimeout(res, 200));
    }
  } catch (err) {
    // ignore
  }

  // Final fallback: open in new tab/window or navigate
  try {
    window.open(url, '_blank', 'noopener');
    return;
  } catch (err) {
    // last resort
    window.location.href = url;
  }
}
