// Centralized Farcaster / sharing helpers

export function shareResultsText(score: number, tPoints: number, username?: string) {
  const base = `I scored ${score} (${tPoints} T Points) on the Triviacast Challenge — beat my score! Play it: https://triviacast.xyz`;
  if (username && username.trim().length > 0) {
    const clean = username.replace(/^@/, '').trim();
    return `@${clean}.farcaster.eth ${base}`;
  }
  return base;
}

/**
 * Optionally produce a "share URL" that opens a web composer with the text prefilled.
 * This is for non-native fallback flows (web-only).
 */
export function shareResultsUrl(score: number, tPoints: number, username?: string) {
  const text = shareResultsText(score, tPoints, username);
  // Farcaster web compose fallback (best-effort) — adjust if you have a canonical deep-link
  return `https://farcaster.xyz/compose?text=${encodeURIComponent(text)}`;
}

/**
 * Attempt to open the native share sheet (navigator.share). If unavailable, open a fallback compose URL.
 * Returns an object describing the performed action.
 */
export async function openNativeShareFallback(text: string) {
  if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
    try {
      await (navigator as any).share({
        title: 'Triviacast',
        text,
        url: 'https://triviacast.xyz'
      });
      return { method: 'navigator.share' };
    } catch (err) {
      // user canceled or share failed — continue to fallback
      return { method: 'navigator.share', error: err };
    }
  }

  // Fallback: open Farcaster web compose in a new tab/window
  try {
    const composeUrl = `https://farcaster.xyz/compose?text=${encodeURIComponent(text)}`;
    if (typeof window !== 'undefined') {
      window.open(composeUrl, '_blank', 'noopener,noreferrer');
      return { method: 'window.open', url: composeUrl };
    }
  } catch (err) {
    return { method: 'fallback', error: err };
  }

  return { method: 'fallback' };
}
