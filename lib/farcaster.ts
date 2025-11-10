/**
 * lib/farcaster.ts
 *
 * Share helpers for Triviacast.
 *
 * This version ensures that any @username mention used in share text
 * will always be suffixed with `.farcaster.eth` unless it already ends
 * with `.eth` or `.farcaster.eth`.
 *
 * Paste this file over your existing lib/farcaster.ts
 */

function hasTaggedFriends(text: string): boolean {
  // Check for Farcaster mentions: @username or @username.eth or @username.farcaster.eth
  // Must be at start of text, after whitespace, or after newline to avoid matching emails
  const mentionPattern = /(^|\s)@[\w-]+(?:\.(?:eth|farcaster\.eth))?/;
  return mentionPattern.test(text);
}

function getPlatform(): 'farcaster' | 'base' | 'web' {
  if (typeof window === 'undefined') return 'web';

  try {
    const ethereum = (window as any).ethereum;
    if (ethereum?.isFarcaster || ethereum?.isMiniApp) {
      return 'farcaster';
    }
  } catch (e) {
    // ignore
  }

  try {
    const connector = sessionStorage.getItem('wagmi.connector');
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
    // console.log('Farcaster SDK not available or composeCast failed, using fallback', error);
  }

  // For Base or Farcaster miniapp, open the app URL directly instead of Warpcast compose
  if (platform === 'base' || platform === 'farcaster') {
    // Extract the app URL from the Warpcast compose URL if it contains embeds
    try {
      const urlObj = new URL(url);
      const embeds: string[] = [];
      urlObj.searchParams.forEach((value, key) => {
        if (key === 'embeds[]' && embeds.length < 1) embeds.push(value);
      });
      if (embeds.length > 0) {
        window.location.href = embeds[0];
        return;
      }
    } catch (e) {
      // ignore and fallback
    }
  }

  // Default: open compose URL in a new tab
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Ensure mentions include the `.farcaster.eth` suffix unless they already
 * end with `.eth` or `.farcaster.eth`.
 *
 * Examples:
 *  - "@alice" => "@alice.farcaster.eth"
 *  - "@alice.eth" => "@alice.eth" (unchanged)
 *  - "@bob.farcaster.eth" => "@bob.farcaster.eth" (unchanged)
 */
export function addFarcasterSuffixToMentions(text: string): string {
  if (!text) return text;
  // Replace only mentions that do NOT already have .eth or .farcaster.eth
  return text.replace(/(^|\s)@([A-Za-z0-9_-]+)(?!\.(?:eth|farcaster\.eth))/g, (_match, prefix, handle) => {
    return `${prefix}@${handle}.farcaster.eth`;
  });
}

// Helper: canonical app URL
export function getBaseUrl(): string {
  return 'https://triviacast.xyz';
}

// Build embed params string for Warpcast compose URL
function buildEmbedsParams(embeds: string[] = []): string {
  if (!embeds || embeds.length === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < Math.min(2, embeds.length); i++) {
    parts.push(`embeds[]=${encodeURIComponent(embeds[i])}`);
  }
  return parts.join('&');
}

/**
 * Build the Warpcast compose URL.
 * NOTE: We now ALWAYS apply addFarcasterSuffixToMentions to the text here,
 * so any @username included in share text will get the `.farcaster.eth`
 * suffix unless it already has an .eth or .farcaster.eth suffix.
 */
export function buildWarpcastShareUrl(text: string, embeds?: string[], options?: { action?: 'cast' | 'share' }): string {
  const base = 'https://warpcast.com/~/compose';
  // Always add suffix to mentions for share text (user requested "always add .farcaster.eth")
  const textForUrl = addFarcasterSuffixToMentions(text);
  const textParam = `text=${encodeURIComponent(textForUrl)}`;

  // Keep previous logic for including embeds (share vs cast)
  const action = options?.action || 'cast';
  const shouldIncludeEmbeds = action === 'share' || !hasTaggedFriends(text);
  const embedsParam = shouldIncludeEmbeds ? buildEmbedsParams(embeds || []) : '';
  return embedsParam ? `${base}?${textParam}&${embedsParam}` : `${base}?${textParam}`;
}

/**
 * Build a share URL that works for both Farcaster and Base.
 * For Farcaster/Base we usually return the canonical app URL (first embed)
 * so the native app opens the correct target; for web we return the Warpcast compose URL.
 *
 * Because we always add `.farcaster.eth` in buildWarpcastShareUrl, web share text
 * will contain the full farcaster handles. If the native app path is used
 * (embeds[0] or getBaseUrl), those URLs are unchanged (they point to the app).
 */
export function buildPlatformShareUrl(text: string, embeds?: string[], options?: { action?: 'cast' | 'share' }): string {
  const platform = getPlatform();
  const action = options?.action || 'cast';

  const shouldIncludeEmbeds = action === 'share' || !hasTaggedFriends(text);

  if (platform === 'base' || platform === 'farcaster') {
    if (shouldIncludeEmbeds && embeds && embeds.length > 0) {
      return embeds[0];
    }
    return getBaseUrl();
  }

  return buildWarpcastShareUrl(text, embeds, options);
}

/* ---- Convenience share builders used across the app ---- */

export function shareAppText(): string {
  const url = getBaseUrl();
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

/**
 * Results text (keeps existing API used by components)
 */
export function shareResultsText(score: number, total: number, percent: number, tPoints: number): string {
  const url = getBaseUrl();
  const points = tPoints.toLocaleString();
  const flair = percent === 100
    ? 'PERFECT RUN 🔥'
    : percent >= 80
    ? 'On a hot streak 💥'
    : percent >= 60
    ? 'Locked in 🎯'
    : 'Come take my crown? 👑';
  const variants = [
    (u: string) => `${flair}\nI scored ${score}/${total} on Triviacast (${percent}%) and earned ${points} T Points — can you beat me? ${u}`,
    (u: string) => `I got ${score}/${total} (${percent}%) on Triviacast and grabbed ${points} T Points. Think you can top that? ${u}`,
    (u: string) => `Triviacast: ${score}/${total} — ${percent}% — ${points} T Points. Try the quiz → ${u}`
  ];
  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  return pick(variants)(url);
}

/**
 * Return a share URL for quiz results. Components expect this export name.
 * The share text will always have `.farcaster.eth` appended to plain @mentions.
 */
export function shareResultsUrl(score: number, total: number, percent: number, tPoints: number): string {
  const text = shareResultsText(score, total, percent, tPoints);
  const url = getBaseUrl();
  return buildPlatformShareUrl(text, [url], { action: 'share' });
}

/**
 * Return a share URL for the global leaderboard.
 * Signature kept simple to match existing usage `shareLeaderboardUrl(null, 0)`
 */
export function shareLeaderboardUrl(username: string | null = null, offset: number = 0): string {
  const url = getBaseUrl();
  let handlePart = '';
  if (username) {
    const raw = username.trim();
    handlePart = raw.startsWith('@') ? raw : `@${raw}`;
    handlePart = ` — ${handlePart}`;
  }
  const text = `Check out the Triviacast leaderboard${handlePart}! See who's on top: ${url}`;
  return buildPlatformShareUrl(text, [url], { action: 'share' });
}
