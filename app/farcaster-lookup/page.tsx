"use client";

import { useState } from 'react';
import { ProfileCard } from '@/components/ProfileCard';
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
  };
  error?: string;
} | null;

export default function FarcasterLookupPage() {
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LookupResult>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (!username || username.trim() === '') {
        setError('Please provide a Farcaster username to lookup');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/farcaster/profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username }),
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
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#2d1b2e] text-center">Farcaster Profile Lookup</h1>
          <p className="text-xs sm:text-sm text-[#5a3d5c] text-center">Enter a Farcaster username to fetch the Farcaster profile.</p>
          <div className="flex flex-col items-center gap-2 w-full max-w-md bg-white rounded-xl border-2 border-[#F4A6B7] shadow-md px-4 py-4">
            <NeynarUserDropdown value={username} onChange={setUsername} />
            <button onClick={lookup} disabled={loading} className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-3 rounded-lg transition shadow-md w-full">{loading ? 'Loading...' : 'Lookup'}</button>
          </div>
          {error && <div className="text-red-600 mt-2">{error}</div>}
          {result && result.profile && (
            <div className="mt-4 bg-white p-4 rounded-xl shadow-md w-full max-w-md flex flex-col items-center">
              <ProfileCard
                avatarImgUrl={result.profile.pfpUrl || "https://i.imgur.com/naZWL9n.gif"}
                bio={result.profile.bio || "No bio available."}
                displayName={result.profile.displayName || result.profile.username || "Unknown"}
                followers={result.profile.followers || 0}
                following={result.profile.following || 0}
                hasPowerBadge={!!result.profile.hasPowerBadge}
                isFollowing={!!result.profile.isFollowing}
                isOwnProfile={!!result.profile.isOwnProfile}
                onCast={() => {}}
                username={result.profile.username || ""}
              />
              {/* Show recent casts if available */}
              {Array.isArray(result.profile.casts) && result.profile.casts.length > 0 && (
                <div className="mt-4 w-full">
                  <h3 className="font-bold text-[#2d1b2e] text-base mb-2">Recent Casts</h3>
                  <ul className="space-y-2">
                    {result.profile.casts.map((cast: any, idx: number) => (
                      <li key={cast.hash || idx} className="bg-gradient-to-r from-pink-50 to-blue-50 rounded-lg p-3 shadow">
                        <div className="text-sm text-[#2d1b2e]">{cast.text || <span className="italic text-gray-400">(No text)</span>}</div>
                        <div className="text-xs text-gray-400 mt-1">{cast.timestamp ? new Date(cast.timestamp).toLocaleString() : ''}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <pre className="text-xs overflow-auto mt-2">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
