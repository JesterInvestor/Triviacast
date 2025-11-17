import React from "react";

function resolveAvatarUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith('data:')) return s;
  if (/^https?:\/\//i.test(s)) return s;
  const ipfsMatch = s.match(/ipfs:\/\/(.+)/i) || s.match(/(?:^|\/ipfs\/)([a-zA-Z0-9]+)/i);
  if (ipfsMatch) {
    const cid = ipfsMatch[1];
    return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }
  return s;
}

// Render avatar from Neynar-provided `pfpUrl` (with IPFS/data handling).
export const ProfileCard: React.FC<ProfileCardProps> = ({ fid, profile, fallbackAddress }) => {
  if (!fid && !profile) return null;

  const raw = profile?.pfpUrl || profile?.pfp_url || profile?.avatar || profile?.avatarImgUrl || profile?.raw?.pfpUrl || profile?.raw?.pfp_url || null;
  const avatarUrl = resolveAvatarUrl(raw) || (fallbackAddress ? `https://cdn.stamp.fyi/avatar/${fallbackAddress}?s=64` : null);
  const username = profile?.username || undefined;
  const displayName = profile?.displayName || profile?.display_name || undefined;

  return (
    <div className="w-full flex items-center gap-3">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={username || displayName || 'profile'} width={40} height={40} className="rounded-full object-cover w-10 h-10" />
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

