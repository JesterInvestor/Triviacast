import React, { useEffect, useState } from "react";

export interface FarcasterProfileProps {
  address: string;
  apiKey?: string; // Optionally override NEYNAR_API_KEY
  className?: string;
}

interface Profile {
  fid: number;
  custodyAddress: string;
  username: string;
  displayName: string;
  pfp: { url: string };
  followerCount: number;
  followingCount: number;
  verifications: string[];
  activeStatus: string;
}


export const FarcasterProfile: React.FC<FarcasterProfileProps> = ({ address, apiKey, className }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);
    fetch(`/api/neynar/user`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ addresses: [address] }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));

        // If missing API key or other configuration issue, treat as no-profile (don't show an error on the UI)
        const upstreamError = json?.error || json?.message;
        if (!res.ok) {
          if (typeof upstreamError === 'string' && /missing\s+NEYNAR_API_KEY/i.test(upstreamError)) {
            setProfile(null);
            return;
          }
          // For other upstream errors, surface a friendly message
          setError(String(upstreamError || `Failed to fetch profile (${res.status})`));
          return;
        }

        // Response shape: { result: { '<loweraddr>': profile }, errors: { ... } }
        const key = address.toLowerCase();
        const profileObj = json?.result?.[key] ?? null;
        if (!profileObj) {
          // If there's a non-fatal message from the API, show nothing instead of an error.
          const errs = json?.errors?.[key] || json?.errors?.[key]?.message || null;
          if (errs && typeof errs === 'string' && /missing|no valid|no profile/i.test(errs)) {
            setProfile(null);
            return;
          }
          // Otherwise surface the message
          setError(errs ? String(errs) : 'No profile found');
          return;
        }
        setProfile(profileObj);
      })
      .catch((e) => {
        // Network or unexpected error — surface it
        setError(String(e?.message || e));
      })
      .finally(() => setLoading(false));
  }, [address, apiKey]);

  if (loading) return <div className={className}>Loading Farcaster profile...</div>;
  if (error) return <div className={className}>Error: {error}</div>;
  if (!profile) return null;

  return (
    <div className={`flex items-center justify-center ${className || ""}`.trim()}>
      <div className="bg-gradient-to-r from-[#FFE4EC] to-[#E6E6FF] border-2 border-[#F4A6B7] rounded-xl shadow-md px-4 py-3 flex items-center gap-4 min-w-[220px]">
        <img
          src={profile.pfp?.url || `https://cdn.stamp.fyi/avatar/${address}?s=44`}
          alt={profile.username}
          className="rounded-full border-2 border-[#DC8291] w-12 h-12 shadow"
        />
        <div className="flex flex-col justify-center">
          <span className="font-bold text-[#2d1b2e] text-base leading-tight">{profile.displayName || profile.username}</span>
          <span className="text-xs text-[#5a3d5c] font-medium">@{profile.username}</span>
          <span className="text-[10px] text-gray-400">FID: {profile.fid}</span>
        </div>
      </div>
    </div>
  );
};
