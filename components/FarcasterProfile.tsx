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
