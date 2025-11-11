// Helpers for building and opening X (Twitter) share URLs

import { shareAppText } from '@/lib/farcaster'

function buildQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) q.set(k, v)
  }
  return q.toString()
}

export function buildXIntentUrl(text: string, options?: { url?: string; hashtags?: string[]; via?: string }) {
  const base = 'https://twitter.com/intent/tweet'
  const qs = buildQuery({
    text,
    url: options?.url,
    hashtags: options?.hashtags && options.hashtags.length ? options.hashtags.join(',') : undefined,
    via: options?.via,
  })
  return `${base}?${qs}`
}

export function shareAppOnXUrl(): string {
  // shareAppText already includes the canonical URL; we also add a hashtag param.
  const text = shareAppText()
  return buildXIntentUrl(text, { hashtags: ['Triviacast'] })
}

export function openXShareUrl(url: string) {
  if (typeof window === 'undefined') return
  try {
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    // ignore
  }
}

export default {
  buildXIntentUrl,
  shareAppOnXUrl,
  openXShareUrl,
}
