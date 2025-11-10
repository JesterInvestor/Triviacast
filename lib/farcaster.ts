/**
 * Shared Farcaster / sharing helpers
 *
 * This file updates share behavior so that when building a "share" preview
 * we append ".farcaster.eth" to each @username mention that does not
 * already end with `.eth` or `.farcaster.eth`.
 *
 * Paste this file over the existing lib/farcaster.ts
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

export async function openShareUrl(url: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const platform = getPlatform();

  try {
    const { sdk } = await import('@farcaster/miniapp-sdk');

    // Try to get context to determine if we're in Farcaster environment
    // Note: sdk.context is a promise that resolves to context or throws
    const context = await sdk.context;
    if (context) {
      // Parse the Warpcast compose URL to extract text and embeds
      const urlObj = new URL(url);
      const text = urlObj.searchParams.get('text') || '';
      const embeds: string[] = [];

      urlObj.searchParams.forEach((value, key) => {
        if (key === 'embeds[]' && embeds.length < 2) {
          embeds.push(value);
        }
      });

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
    // If the URL is the Warpcast compose URL and includes embeds[], prefer first embed (the canonical app link)
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
      // ignore and fallback to opening provided URL
    }
  }

  // Default fallback - open in new tab/window
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Ensure mentions used in share previews include the `.farcaster.eth` suffix
 * unless they already end with `.eth` or `.farcaster.eth`.
 *
 * This targets only plain @username mentions (letters, numbers, underscore, dash).
 *
 * Examples:
 *  - "@alice" => "@alice.farcaster.eth"
 *  - "@alice.eth" => "@alice.eth" (unchanged)
 *  - "@bob.farcaster.eth" => "@bob.farcaster.eth" (unchanged)
 */
export function addFarcasterSuffixToMentions(text: string): string {
  if (!text) return text;
  // Replace only mentions that do NOT already have .eth or .farcaster.eth
  // Keep leading whitespace/newline intact
  // We use a negative lookahead to avoid touching existing suffixes.
  return text.replace(/(^|\s)@([A-Za-z0-9_-]+)(?!\.(?:eth|farcaster\.eth))/g, (_match, prefix, handle) => {
    return `${prefix}@${handle}.farcaster.eth`;
  });
}

// Helper: simple base URL for the app
export function getBaseUrl(): string {
  // Keep in sync with site host
  return 'https://triviacast.xyz';
}

// Build embed params string for Warpcast compose URL
function buildEmbedsParams(embeds: string[] = []): string {
  if (!embeds || embeds.length === 0) return '';
  // Warpcast expects embeds[] params, we limit to first two
  const parts: string[] = [];
  for (let i = 0; i < Math.min(2, embeds.length); i++) {
    parts.push(`embeds[]=${encodeURIComponent(embeds[i])}`);
  }
  return parts.join('&');
}

// Build the Warpcast compose URL
export function buildWarpcastShareUrl(text: string, embeds?: string[], options?: { action?: 'cast' | 'share' }): string {
  const base = 'https://warpcast.com/~/compose';
  // If this is intended to be a "share preview", append the .farcaster.eth suffix to mentions
  const action = options?.action || 'cast';
  const textForUrl = action === 'share' ? addFarcasterSuffixToMentions(text) : text;
  const textParam = `text=${encodeURIComponent(textForUrl)}`;

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
  // Ensure that for share previews we return an app URL (embed) — the preview shown by the app
  // should include the suffixed mentions. So if we're returning an embed URL (embeds[0]),
  // make sure to transform the text in the actual embed if you control embed generation.
  // In many places we pass the canonical app URL as the embed; that URL itself doesn't need
  // per-mention suffixing, because the preview text is the text param passed to the composer.
  if (platform === 'base' || platform === 'farcaster') {
    if (shouldIncludeEmbeds && embeds && embeds.length > 0) {
      return embeds[0];
    }
    return getBaseUrl();
  }

  // For web, use Warpcast compose URL (opens Warpcast composer on the web)
  return buildWarpcastShareUrl(text, embeds, options);
}

// A few niceties used elsewhere in the app
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
