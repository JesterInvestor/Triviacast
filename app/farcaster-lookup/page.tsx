
"use client";
import React from 'react';
import WagmiWalletConnect from '@/components/WagmiWalletConnect';
import ShareButton from '@/components/ShareButton';
import { useState } from 'react';
import { useNeynarContext } from '@neynar/react';
import Quiz from '@/components/Quiz';
import { ProfileCard } from '@/components/ProfileCard';
import { NeynarCastCard } from '@/components/NeynarCastCard';
import NeynarUserDropdown from '@/components/NeynarUserDropdown';

type Cast = {
  hash?: string;
  text?: string;
  timestamp?: string;
};

type LookupResult = {
  found?: boolean;
  profile?: {
    username?: string;
    pfpUrl?: string;
    bio?: string;
// ...existing code...
  displayName?: string;
  followers?: number;
  following?: number;
  hasPowerBadge?: boolean;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
  casts?: Cast[];
  };
  error?: string;
} | null;

export default function FarcasterLookupPage() {
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LookupResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const { user: neynarUser } = useNeynarContext();

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
      // If the response is a profile object, wrap it as { profile: data }
      if (data && (data.address || data.username) && !data.error) {
        setResult({ profile: data });
      } else {
        setResult(data);
      }
    } catch (err: unknown) {
      const e = err as { message?: string } | null;
      setError(e?.message || 'unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      {/* Wallet connect at top */}
      <div className="w-full flex flex-col items-center justify-center pt-4 pb-2">

  <WagmiWalletConnect />
      </div>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          <div className="mb-2 flex justify-center">
            <ShareButton
              url="https://warpcast.com/~/compose?text=Come%20check%20out%20our%20farcaster%20lookup%20page%20powered%20by%20neynar!!%20https://triviacast.xyz/farcaster-lookup"
              className="bg-[#DC8291] hover:bg-[#C86D7D] text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow"
              ariaLabel="Share Farcaster Lookup"
            >
              <span>Share on Farcaster</span>
            </ShareButton>
          </div>
            <div className="flex flex-col items-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#2d1b2e] text-center">Farcaster Profile Lookup</h1>
            <span className="text-xs text-[#5a3d5c] mt-1">powered by <strong className="text-[#2d1b2e]">neynar</strong></span>
            </div>
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
              {/* Play Quiz button shown inline after a successful lookup */}
              <div className="w-full mt-3">
                <button
                  onClick={() => setQuizOpen(true)}
                  className="w-full bg-[#F4A6B7] hover:bg-[#E8949C] text-white font-bold py-2 px-3 rounded-lg transition shadow-md"
                >
                  Play Quiz
                </button>
              </div>

              {quizOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="w-11/12 max-w-3xl">
                    <Quiz
                      onComplete={async (res) => {
                        // Post result to server. Use Neynar client signer_uuid for auth header when available.
                        try {
                          const headers: Record<string, string> = { 'content-type': 'application/json' };
                          if (neynarUser?.signer_uuid) {
                            headers['authorization'] = `Neynar ${neynarUser.signer_uuid}`;
                          }
                          if (neynarUser?.fid) {
                            headers['x-neynar-fid'] = String(neynarUser.fid);
                          }

                          await fetch('/api/send-result', {
                            method: 'POST',
                            headers: {
                              ...headers,
                            },
                            body: JSON.stringify({ targetHandle: result?.profile?.username, quizId: res.quizId, score: res.score, details: res.details || {} }),
                          });
                        } catch (e) {
                          // ignore for now; the API will return a status we can inspect in the future
                        } finally {
                          setQuizOpen(false);
                        }
                      }}
                    />
                  </div>
                </div>
              )}
              {/* Show recent casts if available */}
              {Array.isArray(result.profile.casts) && result.profile.casts.length > 0 && (
                <div className="mt-4 w-full">
                  <h3 className="font-bold text-[#2d1b2e] text-base mb-2">Recent Casts</h3>
                  <ul className="space-y-2">
                    {result.profile.casts.map((cast: any, idx: number) => (
                      <li key={cast.hash || idx}>
                        <NeynarCastCard
                          identifier={cast.hash || ''}
                          renderEmbeds={true}
                          type="url"
                        />
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
