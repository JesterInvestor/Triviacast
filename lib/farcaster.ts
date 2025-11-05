// Unified Farcaster/share helpers

export function shareResultsText(score: number, tPoints: number, username?: string) {
  const base = `I scored ${score} (${tPoints} T Points) on the Triviacast Challenge — beat my score! Play it: https://triviacast.xyz`;
  if (username && username.trim().length > 0) {
    // ensure username normalized (no leading @)
    const clean = username.replace(/^@/, '').replace(/\s+/g, '');
    return `@${clean}.farcaster.eth ${base}`;
  }
  return base;
}

/**
 * Utility that attempts to open the native share sheet (navigator.share).
 * If navigator.share is not available it will open a fallback URL (compose link)
 * or simply return the text for caller to copy.
 *
 * Returns a Promise that resolves to an object describing what was done.
 */
export async function openNativeShareFallback(text: string, url?: string) {
  // try navigator.share first (native share / popup)
  if (typeof navigator !== 'undefined' && (navigator as any).share) {
    try {
      await (navigator as any).share({
        title: 'Triviacast',
        text,
        url: url ?? 'https://triviacast.xyz'
      });
      return { method: 'navigator.share' };
    } catch (err) {
      // user cancelled or share failed — continue to fallback
      return { method: 'navigator.share', error: err };
    }
  }

  // Fallback: try to open Farcaster web compose (best-effort).
  // NOTE: adjust the compose URL if you have a canonical Farcaster deep-link.
  const composeUrl = `https://farcaster.xyz/compose?text=${encodeURIComponent(text)}`;
  try {
    // Try opening in a new window/tab to trigger the Farcaster web composer
    if (typeof window !== 'undefined') {
      window.open(composeUrl, '_blank', 'noopener,noreferrer');
      return { method: 'open.url', url: composeUrl };
    }
  } catch (err) {
    // last fallback: return text for copy
    return { method: 'fallback', error: err, text };
  }

  return { method: 'fallback', text };
}
