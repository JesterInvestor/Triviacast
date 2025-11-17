import React from "react";
import Image from 'next/image';

// Simplified: render avatar only from Neynar-provided `pfpUrl` (no fallbacks).
export const ProfileCard: React.FC<ProfileCardProps> = ({ fid, profile }) => {
  if (!fid && !profile) return null;

  // Use only Neynar-provided pfp (normalized to `pfpUrl` by our API route).
  const pfp = profile?.pfpUrl || null;
  const username = profile?.username || undefined;
  const displayName = profile?.displayName || undefined;

  return (
    <div className="w-full flex items-center gap-3">
      {pfp ? (
        <Image src={pfp} alt={username || displayName || 'profile'} width={40} height={40} className="rounded-full object-cover" unoptimized />
      ) : null}
      <div>
        <div className="font-bold text-lg">{displayName || (username ? `@${username}` : `FID ${fid ?? ''}`)}</div>
        {username && <div className="text-sm text-gray-500">@{username}</div>}
      </div>
    </div>
  );
};

export interface ProfileCardProps {
  fid?: number;
  profile?: any;
}

