"use client";
import React from 'react';
import WagmiWalletConnect from '@/components/WagmiWalletConnect';
import ShareButton from '@/components/ShareButton';
import { buildPlatformShareUrl } from '@/lib/farcaster';
import { useState, useEffect } from 'react';
import Quiz from '@/components/Quiz';
import { useAccount } from 'wagmi';
import { ProfileCard } from '@/components/ProfileCard';
import { NeynarCastCard } from '@/components/NeynarCastCard';
import NeynarUserDropdown from '@/components/NeynarUserDropdown';
// leaderboard removed from lookup page per request

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
    displayName?: string;
    followers?: number;
    following?: number;
    hasPowerBadge?: boolean;
    isFollowing?: boolean;
    isOwnProfile?: boolean;
    casts?: Cast[];
    fid?: number;
  };
  error?: string;
} | null;

export default function FarcasterLookupPage() {
  const { address } = useAccount();
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LookupResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState<string>('');
  const [previewLink, setPreviewLink] = useState<string>('');
  const [related, setRelated] = useState<Array<any>>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
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
        // fetch related players suggestions for this profile (by fid) in background
        try {
          const fid = data.raw?.fid || data.fid || null;
          if (fid) {
            setRelatedLoading(true);
            const r = await fetch('/api/neynar/related', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fid: Number(fid), limit: 6 }) });
            if (r.ok) {
              const parsed = await r.json();
              setRelated(Array.isArray(parsed.result) ? parsed.result : []);
            } else {
              setRelated([]);
            }
          } else {
            setRelated([]);
          }
        } catch (err) {
          setRelated([]);
        } finally {
          setRelatedLoading(false);
        }
      } else {
        setResult(data);
      }

      // Backend relayer disabled; skip on-chain mark.
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
      {/* Top bar: wallet connect + share aligned like home page */}
      <div className="w-full flex items-center justify-end gap-2 mb-2 sm:mb-4 px-3 sm:px-4 pt-4">
        <WagmiWalletConnect />
        <ShareButton
          url={buildPlatformShareUrl(
            'Think you can outsmart your friends? Take the Challenge on the Challenge page — powered by neynar! https://triviacast.xyz/farcaster-lookup',
            ['https://triviacast.xyz/farcaster-lookup'],
            { action: 'share' }
          )}
          className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-3 sm:py-2 sm:px-4 rounded-lg transition shadow-md flex items-center gap-2 justify-center min-h-[40px]"
          ariaLabel="Share Challenge page"
        />
      </div>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          
            <div className="flex flex-col items-center">
            {/* Small brain icon above header for visual consistency with other pages */}
            <img
              src="/brain-small.svg"
              alt="Brain icon"
              className="w-10 h-10 sm:w-12 sm:h-12 mb-2 drop-shadow"
              loading="lazy"
            />
            <h1 className="text-5xl sm:text-6xl font-extrabold text-[#2d1b2e] text-center">Challenge and Find New Friends</h1>
            <span className="text-xs text-[#5a3d5c] mt-1 inline-flex items-center gap-1">
              powered by
              <a
                href="https://farcaster.xyz/neynar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2d1b2e] underline decoration-dotted underline-offset-2 hover:decoration-solid"
                aria-label="Neynar on Farcaster"
              >
                neynar
              </a>
              <img src="/neynar.svg" alt="Neynar" className="w-3 h-3 opacity-90" />
            </span>
            </div>
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
            <button
              onClick={lookup}
              disabled={loading}
              className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-3 rounded-lg transition shadow-md w-full"
            >
              {loading ? 'Searching…' : 'Lookup'}
            </button>
          </div>
          {error && <div className="text-red-600 mt-2">{error}</div>}
          {result && result.profile && (
            <div className="mt-4 bg-white p-4 rounded-xl shadow-md w-full max-w-md flex flex-col items-center">
              <ProfileCard fid={result.profile.fid} />
              {/* Play Quiz button shown inline after a successful lookup */}
              <div className="w-full mt-3">
                <button
                  onClick={() => setQuizOpen(true)}
                  className="w-full bg-[#F4A6B7] hover:bg-[#E8949C] text-white font-bold py-2 px-3 rounded-lg transition shadow-md"
                >
                  Play Quiz
                </button>
              </div>

              {/* Related players section */}
              <div className="w-full mt-4">
                <h4 className="font-semibold text-[#2d1b2e] mb-2">Related players</h4>
                {relatedLoading ? (
                  <div className="text-sm text-[#5a3d5c]">Loading related players…</div>
                ) : related && related.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto py-2">
                    {related.map((p: any) => (
                      <div key={p.fid || p.username} className="flex-shrink-0 w-40 bg-white rounded-lg border p-3 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                          <img src={p.pfpUrl || `https://cdn.stamp.fyi/avatar/${String(p.raw?.custody_address || '')}?s=64`} alt={p.username || p.displayName || 'user'} className="w-10 h-10 rounded-full" />
                          <div>
                            <div className="text-sm font-bold">{p.displayName || p.username || `FID ${p.fid}`}</div>
                            <div className="text-xs text-gray-500">{p.username || ''}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{(p.followers || 0).toLocaleString()} followers</div>
                        <div className="flex gap-2">
                          <button
                            className="flex-1 bg-[#F4A6B7] text-white text-xs py-1 rounded"
                            onClick={() => {
                              // populate lookup with this username and trigger lookup
                              const uname = p.username ? String(p.username).replace(/^@/, '') : '';
                              if (uname) {
                                setUsername(uname);
                                setTimeout(() => lookup(), 40);
                              }
                            }}
                          >
                            View
                          </button>
                          <button
                            className="flex-1 border text-xs py-1 rounded"
                            onClick={() => {
                              // open their Neynar profile in a new tab
                              const user = p.username ? p.username.replace(/^@/, '') : String(p.fid);
                              window.open(`https://warpcast.com/${encodeURIComponent(user)}`, '_blank');
                            }}
                          >
                            Warpcast
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[#5a3d5c]">No related players found.</div>
                )}
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
                        // Use tPoints from quiz results (includes streak bonuses); fallback to base calc
                        const computedTPoints = typeof (res as any)?.details?.tPoints === 'number'
                          ? (res as any).details.tPoints
                          : (res.score ?? 0) * 1000;
                        // Use the Triviacast Challenge page link for share links (clickable HTTPS).
                        const challengeLink = 'https://triviacast.xyz/farcaster-lookup';
                        const pointsStr = Number(computedTPoints).toLocaleString();
                        // Spiced / playful default message
                        const defaultText = cleanHandle
                          ? `@${cleanHandle} — I just crushed Triviacast with ${res.score} (🔥 ${pointsStr} T Points)! Think you can beat me? Take the Challenge on the Challenge page — ${challengeLink}`
                          : `I just crushed Triviacast with ${res.score} (🔥 ${pointsStr} T Points)! Think you can beat me? Take the Challenge on the Challenge page — ${challengeLink}`;
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
                    {result.profile.casts.slice(0,5).map((cast: any, idx: number) => (
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
              {/* Top players removed from lookup per request */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}