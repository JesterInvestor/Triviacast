import React from 'react';

// Simplified ProfileCard: render the pfp field if present, otherwise fall back to stamp.fyi avatar.
export const ProfileCard: React.FC<ProfileCardProps> = ({ fid, profile, fallbackAddress }) => {
  if (!fid && !profile) return null;

  const src = profile?.pfpUrl || profile?.pfp_url || profile?.avatar || profile?.avatarImgUrl || null;
  const avatarSrc = src || (fallbackAddress ? `https://cdn.stamp.fyi/avatar/${fallbackAddress}?s=64` : null);
  const username = profile?.username || undefined;
  const displayName = profile?.displayName || profile?.display_name || undefined;

  return (
    <div className="w-full flex items-center gap-3">
      {avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarSrc} alt={username || displayName || 'profile'} width={40} height={40} className="rounded-full object-cover w-10 h-10" />
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

