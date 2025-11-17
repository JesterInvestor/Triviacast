import React, { useEffect } from 'react';
import { Avatar, resolveAvatarUrl } from './Avatar';

// Render avatar from Neynar-provided `pfpUrl` (with IPFS/data handling).
export const ProfileCard: React.FC<ProfileCardProps> = ({ fid, profile, fallbackAddress }) => {
  if (!fid && !profile) return null;

  const raw = profile?.pfpUrl || profile?.pfp_url || profile?.avatar || profile?.avatarImgUrl || profile?.raw?.pfpUrl || profile?.raw?.pfp_url || null;
  const username = profile?.username || undefined;
  const displayName = profile?.displayName || profile?.display_name || undefined;

  // Debug: log profile and resolved avatar URL for troubleshooting
  useEffect(() => {
    try {
      const resolved = resolveAvatarUrl(raw) || (fallbackAddress ? `https://cdn.stamp.fyi/avatar/${fallbackAddress}?s=64` : null);
      console.debug('[ProfileCard] render', { fid, username, displayName, raw, resolved });
    } catch (e) {
      console.debug('[ProfileCard] error logging', String(e));
    }
  }, [fid, username, displayName, raw, fallbackAddress]);

  return (
    <div className="w-full flex items-center gap-3">
      {raw || fallbackAddress ? (
        <Avatar srcRaw={raw} fallbackAddress={fallbackAddress || null} className="rounded-full object-cover w-10 h-10" size={40} alt={username || displayName || 'profile'} />
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
  fallbackAddress?: string;
}

