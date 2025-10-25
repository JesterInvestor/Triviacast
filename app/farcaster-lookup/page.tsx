"use client";

import { useState } from 'react';
import ProfileCard from '@/components/ProfileCard';
import NeynarUserDropdown from '@/components/NeynarUserDropdown';

type LookupResult = { found?: boolean; profile?: { username?: string; pfpUrl?: string }; error?: string } | null;

export default function FarcasterLookupPage() {
  const [address, setAddress] = useState<string>('');
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LookupResult>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/farcaster/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'lookup failed');
      setResult(data);
    } catch (err: unknown) {
      const e = err as { message?: string } | null;
      setError(e?.message || 'unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
  <h1 className="text-2xl font-bold mb-4">Farcaster profile lookup</h1>
      <p className="mb-4 text-sm text-gray-600">Enter an Ethereum address to fetch the Farcaster profile (via server API).</p>
      <div className="mb-4 flex flex-col gap-2" style={{ maxWidth: '400px' }}>
        <NeynarUserDropdown value={username} onChange={setUsername} />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." className="border p-2 rounded w-full" />
        <button onClick={lookup} disabled={loading} className="bg-blue-600 text-white px-4 rounded">{loading ? 'Loading...' : 'Lookup'}</button>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {result && (
        <div className="mt-4 bg-white p-4 rounded shadow">
          <ProfileCard
            avatarImgUrl="https://i.imgur.com/naZWL9n.gif"
            bio="building /neynar 🪐 | neynar.com | /rish"
            displayName="rish"
            followers={127364}
            following={676}
            hasPowerBadge
            isFollowing
            isOwnProfile
            onCast={function Xs(){}}
            username="rish"
          />
          <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
