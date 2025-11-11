"use client";
import React, { useState } from 'react';
import WagmiWalletConnect from '@/components/WagmiWalletConnect';
import ShareButton from '@/components/ShareButton';
import Quiz from '@/components/Quiz';
import { useAccount } from 'wagmi';
import NeynarUserDropdown from '@/components/NeynarUserDropdown';

type LookupResult = {
  found?: boolean;
  profile?: {
    username?: string;
    pfpUrl?: string;
    bio?: string;
    displayName?: string;
    followers?: number;
    following?: number;
    hasPowerBadge?: boolean;
    isFollowing?: boolean;
    isOwnProfile?: boolean;
    casts?: any[];
    fid?: number;
  };
  error?: string;
} | null;

export default function FarcasterLookupPage() {
  const { address } = useAccount();
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LookupResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [relatedPlayers, setRelated] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState<boolean>(false);

  // Updated lookup function with usernameOverride
  const lookup = async (usernameOverride?: string) => {
    setLoading(true);
    setResult(null);
    setError(null);

    const userToLookup = usernameOverride || username;
    if (!userToLookup.trim()) {
      setError('Please enter a username.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/farcaster/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userToLookup }),
      });
      const data = await res.json();
      if (res.ok && data?.found) {
        setResult({ profile: data });
        if (data.fid) {
          // Fetch related users
          const relatedRes = await fetch(`/api/neynar/related/${data.fid}`);
          const relatedData = await relatedRes.json();
          setRelated(relatedData || []);
        }
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data. Please try again later.');
    } finally {
      setLoading(false);
      setRelatedLoading(false);
    }
  };

  return (
    <div>
      <h1>Challenge a Friend</h1>
      <NeynarUserDropdown value={username} onChange={setUsername} />
      <button onClick={() => lookup()} disabled={loading}>
        {loading ? 'Searching...' : 'Lookup'}
      </button>

      {error && <p>{error}</p>}

      {result?.profile && (
        <div>
          <h2>{result.profile.displayName || result.profile.username}</h2>
          <p>{result.profile.bio}</p>
        </div>
      )}

      {relatedPlayers.length > 0 && (
        <div>
          <h3>Related Players:</h3>
          {relatedPlayers.map((player) => (
            <button
              key={player.username}
              onClick={() => lookup(player.username)}
            >
              {player.username}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}