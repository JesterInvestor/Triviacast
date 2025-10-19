"use client";

import { useState } from 'react';

export default function FarcasterLookup({
  onResult,
  initialAddress,
}: {
  onResult: (address: string, profile: { username?: string; pfpUrl?: string } | null) => void;
  initialAddress?: string;
}) {
  const [address, setAddress] = useState(initialAddress || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/farcaster/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'lookup failed');
      if (data?.found) {
        onResult(address.toLowerCase(), data.profile || null);
      } else {
        onResult(address.toLowerCase(), null);
      }
    } catch (e: any) {
      setError(e?.message || 'error');
      onResult(address.toLowerCase(), null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." className="border px-2 py-1 rounded text-sm w-full" />
      <button onClick={lookup} disabled={loading || !address} className="bg-[#F4A6B7] px-3 py-1 rounded text-sm">
        {loading ? '...' : 'Lookup'}
      </button>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
