
"use client";
import React from 'react';
import WagmiWalletConnect from '@/components/WagmiWalletConnect';
import ShareButton from '@/components/ShareButton';
import { buildPlatformShareUrl } from '@/lib/farcaster';
import { useState } from 'react';
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState<string>('');
  const [previewLink, setPreviewLink] = useState<string>('');
  // NOTE: intentionally not auto-prefilling the lookup from URL params.
  // Shares should point to the canonical site only (https://triviacast.xyz).

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

  const handleClosePreview = () => {
    // Close both preview and quiz to return to the profile view
    setPreviewOpen(false);
    setQuizOpen(false);
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
              url={buildPlatformShareUrl(
                'Come check out our Farcaster lookup page powered by neynar!! https://triviacast.xyz/farcaster-lookup',
                ['https://triviacast.xyz/farcaster-lookup'],
                { action: 'share' }
              )}
              className="bg-[#DC8291] hover:bg-[#C86D7D] text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow"
              ariaLabel="Share Farcaster Lookup"
            >
              <span>Share on Farcaster</span>
            </ShareButton>
          </div>
            <div className="flex flex-col items-center">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-[#2d1b2e] text-center">Challenge</h1>
            <span className="text-xs text-[#5a3d5c] mt-1">powered by <strong className="text-[#2d1b2e]">neynar</strong></span>
            </div>
          <p className="text-xs sm:text-sm text-[#5a3d5c] text-center">Enter a Farcaster username to fetch the Farcaster profile.</p>
          <div className="w-full max-w-md bg-white rounded-md border p-3 mt-3 text-sm text-gray-700">
            <strong className="block mb-1">How to challenge a friend</strong>
            <ol className="list-decimal pl-6">
              <li>Search your friend's Farcaster handle using the field above.</li>
              <li>Scroll Down - Click <em>Lookup</em> and then <em>Play Quiz</em> on their profile.</li>
              <li>After you finish the quiz you'll see a preview message that mentions them.</li>
              <li>Post from your account via <strong>Base</strong> or copy and paste in <strong>Farcaster</strong>.</li>
            </ol>
          </div>
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
                      onComplete={(res) => {
                        // Close the quiz modal first
                        setQuizOpen(false);
                        // Open an editable preview modal so the user can edit the cast text
                        const target = result?.profile?.username || '';
                        // normalize handle so we don't end up with duplicate @ (some sources include '@')
                        const cleanHandle = target.startsWith('@') ? target.slice(1) : target;
                        const tPoints = (res.score ?? 0) * 1000; // 1 correct = 1000 T points (info page)
                        // Use the Triviacast site link for share links (clickable HTTPS).
                        const challengeLink = 'https://triviacast.xyz';
                        const defaultText = cleanHandle
                          ? `@${cleanHandle}.farcaster.eth I scored ${res.score} (${tPoints} T Points) on the Triviacast Challenge — beat my score! Play it: ${challengeLink}`
                          : `I scored ${res.score} (${tPoints} T Points) on the Triviacast Challenge — beat my score! Play it: ${challengeLink}`;
                        setPreviewText(defaultText);
                        setPreviewLink(challengeLink);
                        setPreviewOpen(true);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Preview / Compose modal: lets user edit the cast, open Warpcast to post from their account, or post via server */}
              {previewOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                  onClick={() => handleClosePreview()}
                >
                  <div className="w-11/12 max-w-2xl bg-white rounded-lg p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-lg font-bold mb-2">Preview your cast</h2>
                    <p className="text-sm text-gray-600 mb-2">Review the message below and post it from your account or copy it to share manually.</p>
                    <textarea
                      className="w-full h-32 p-2 border rounded mb-2 bg-gray-50"
                      value={previewText}
                      readOnly
                    />
                    <p className="text-xs text-gray-500 mb-3">To edit this message before posting, click "Post from my account" — edits should be done in Warpcast's compose box.</p>

                    <div className="flex gap-2 items-center">
                      <button
                        className="bg-[#4F46E5] text-white px-3 py-2 rounded font-semibold"
                        onClick={() => {
                          // Open Warpcast compose with the text so the user can post from their account
                          const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(previewText)}`;
                          window.open(url, '_blank');
                        }}
                      >
                        Post from my account
                      </button>

                      <button
                        type="button"
                        className="border px-3 py-2 rounded"
                        onClick={async () => {
                          const textToCopy = `${previewText}${previewLink ? ` ${previewLink}` : ''}`;
                          // Try modern clipboard API first
                          try {
                            if (navigator && (navigator as any).clipboard && (navigator as any).clipboard.writeText) {
                              await (navigator as any).clipboard.writeText(textToCopy);
                              alert('Copied to clipboard');
                              return;
                            }
                          } catch (err) {
                            // ignore and fallback
                          }

                          // Fallback for older browsers: create a temporary textarea and execCommand
                          try {
                            const ta = document.createElement('textarea');
                            ta.value = textToCopy;
                            // Move it off-screen
                            ta.style.position = 'fixed';
                            ta.style.left = '-9999px';
                            document.body.appendChild(ta);
                            ta.select();
                            const ok = document.execCommand('copy');
                            document.body.removeChild(ta);
                            if (ok) {
                              alert('Copied to clipboard');
                              return;
                            }
                          } catch (err) {
                            // ignore
                          }

                          alert('Copy failed — please select the text manually and copy.');
                        }}
                      >
                        Copy
                      </button>

                      <button type="button" className="ml-auto text-sm text-gray-600" onClick={handleClosePreview}>Close</button>
                    </div>
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
