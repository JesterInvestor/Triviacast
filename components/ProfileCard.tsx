import React, { useEffect, useState } from "react";

export const ProfileCard: React.FC<ProfileCardProps> = ({ fid, profile }) => {
  const [NeynarProfileCard, setNeynarProfileCard] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("@neynar/react");
        if (mounted && mod && mod.NeynarProfileCard) setNeynarProfileCard(() => mod.NeynarProfileCard);
      } catch (e) {
        // Neynar react not available in this environment — fallback will be used
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!fid && !profile) return null;

  // If the NeynarProfileCard component is available, prefer it for a rich profile display
  if (NeynarProfileCard && fid) {
    return (
      <div className="w-full">
        <NeynarProfileCard fid={fid} />
      </div>
    );
  }

  // Fallback simple profile display using provided `profile` data
  const avatar = profile?.pfpUrl || profile?.avatarImgUrl || profile?.raw?.pfp_url || profile?.raw?.pfpUrl || null;
  const username = profile?.username || (profile?.raw?.username ? String(profile.raw.username).replace(/^@/, '') : undefined) || undefined;
  const displayName = profile?.displayName || profile?.raw?.display_name || profile?.raw?.name || undefined;

  return (
    <div className="w-full flex items-center gap-3">
      <img
        src={avatar || 
          (profile?.raw?.custody_address ? `https://cdn.stamp.fyi/avatar/${String(profile.raw.custody_address)}?s=128` : '/neynar.svg')}
        alt={username || displayName || 'profile'}
        className="w-16 h-16 rounded-full object-cover"
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
}

