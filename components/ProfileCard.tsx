import React from "react";

// Default behaviour: always render the simple fallback avatar and text.
// Loading the full Neynar widget can cause a client-side re-render that
// replaces the avatar (observed as a brief flash then disappearance in
// preview environments). To avoid that, widget loading is opt-in via
// the `useNeynarWidget` prop.
export const ProfileCard: React.FC<ProfileCardProps> = ({ fid, profile, useNeynarWidget = false }) => {
  if (!fid && !profile) return null;

  // Fallback simple profile display using provided `profile` data
  const avatar = profile?.pfpUrl || profile?.avatarImgUrl || profile?.raw?.pfp_url || profile?.raw?.pfpUrl || null;
  const username = profile?.username || (profile?.raw?.username ? String(profile.raw.username).replace(/^@/, '') : undefined) || undefined;
  const displayName = profile?.displayName || profile?.raw?.display_name || profile?.raw?.name || undefined;

  return (
    <div className="w-full flex items-center gap-3">
      <img
        src={avatar || (profile?.raw?.custody_address ? `https://cdn.stamp.fyi/avatar/${String(profile.raw.custody_address)}?s=128` : '/neynar.svg')}
        alt={username || displayName || 'profile'}
        className="w-16 h-16 rounded-full object-cover"
        onError={(e) => { try { (e.currentTarget as HTMLImageElement).src = '/neynar.svg'; } catch {} }}
      />
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
  useNeynarWidget?: boolean;
}

