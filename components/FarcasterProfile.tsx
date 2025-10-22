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
    fetch(`/api/neynar/user?address=${address}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch profile");
        const json = await res.json();
        setProfile(json?.result?.user ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [address, apiKey]);

  if (loading) return <div className={className}>Loading Farcaster profile...</div>;
  if (error) return <div className={className}>Error: {error}</div>;
  if (!profile) return <div className={className}>No Farcaster profile found.</div>;

  return (
    <div className={`flex items-center gap-3 ${className || ""}`.trim()}>
      <img
        src={profile.pfp?.url || `https://cdn.stamp.fyi/avatar/${address}?s=44`}
        alt={profile.username}
        className="rounded-full border-2 border-[#F4A6B7] w-11 h-11"
      />
      <div>
        <div className="font-semibold">{profile.displayName || profile.username}</div>
        <div className="text-xs text-gray-500">FID: {profile.fid}</div>
        <div className="text-xs text-gray-500">{profile.username}</div>
      </div>
    </div>
  );
};
