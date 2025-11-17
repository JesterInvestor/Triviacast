"use client";

import { useState } from 'react';
import { resolveAvatarUrl } from '@/lib/avatar';

type Profile = { username?: string; pfpUrl?: string } | null;

export default function FarcasterLookup({
  onResult,
  initialAddress,
}: {
  onResult: (address: string, profile: Profile) => void;
  initialAddress?: string;
}) {
  const [address, setAddress] = useState(initialAddress || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(null);

  const isHexAddress = (s?: string) => typeof s === 'string' && /^0x[a-fA-F0-9]{40}$/.test(s.trim());

  const lookup = async () => {
    setLoading(true);
    setError(null);
    setProfile(null);
    try {
      const res = await fetch('/api/farcaster/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data: { found?: boolean; profile?: { username?: string; pfpUrl?: string }; error?: string } = await res.json();
      if (!res.ok) throw new Error(data?.error || 'lookup failed');
      if (data?.found) {
        setProfile(data.profile || null);
        onResult(address.toLowerCase(), data.profile || null);
      } else {
        setProfile(null);
        onResult(address.toLowerCase(), null);
      }
    } catch (err) {
      const e = err as Error | undefined;
      setError(e?.message || 'error');
      setProfile(null);
      onResult(address.toLowerCase(), null);
    } finally {
      setLoading(false);
    }
  };

  const avatarSrc = (() => {
    const pfp = profile?.pfpUrl || (profile as any)?.raw?.pfpUrl || (profile as any)?.raw?.pfp_url || null;
    const resolved = resolveAvatarUrl(pfp) || null;
    if (resolved) return resolved;
    // fallback to stamp.fyi when we have a valid custody address from the returned profile, else use typed input
    const custody = (profile as any)?.raw?.custody_address;
    if (custody && typeof custody === 'string' && /^0x[a-fA-F0-9]{40}$/.test(custody)) return `https://cdn.stamp.fyi/avatar/${custody.toLowerCase()}?s=48`;
    if (isHexAddress(address)) return `https://cdn.stamp.fyi/avatar/${address.toLowerCase()}?s=48`;
    return null;
  })();

  return (
    <div className="flex items-center gap-2">
      {avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarSrc} alt={profile?.username || 'avatar'} className="w-8 h-8 rounded-full object-cover" />
      ) : null}
      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." className="border px-2 py-1 rounded text-sm flex-1" />
      <button onClick={lookup} disabled={loading || !address} className="bg-[#F4A6B7] px-3 py-1 rounded text-sm">
        {loading ? '...' : 'Lookup'}
      </button>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
