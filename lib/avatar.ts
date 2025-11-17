"use client";

export function resolveAvatarUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith('data:')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  // ipfs://CID or /ipfs/CID
  const ipfsMatch = s.match(/ipfs:\/\/(.+)/i) || s.match(/(?:^|\/ipfs\/)([a-zA-Z0-9]+)/i);
  if (ipfsMatch) {
    const cid = ipfsMatch[1];
    return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }
  return s;
}

export default resolveAvatarUrl;
