import React from 'react';
import { resolveAvatarUrl } from '@/lib/avatar';

// Simplified ProfileCard: render the pfp field if present, otherwise fall back to stamp.fyi avatar.
export const ProfileCard: React.FC<ProfileCardProps> = ({ fid, profile, fallbackAddress }) => {
  if (!fid && !profile) return null;

  // Normalize possible avatar fields and prefer server-provided `pfpUrl` when available.
  const src = profile?.pfpUrl || profile?.avatarImgUrl || profile?.pfp_url || profile?.avatar || profile?.raw?.pfpUrl || profile?.raw?.pfp_url || null;
  const resolved = resolveAvatarUrl(src) || null;
  const avatarSrc = resolved || (fallbackAddress ? `https://cdn.stamp.fyi/avatar/${fallbackAddress}?s=64` : null);

  // Normalize username to avoid duplicate leading @ characters from different sources
  const rawUsername = profile?.username ?? undefined;
  const cleanUsername = typeof rawUsername === 'string' && rawUsername ? String(rawUsername).replace(/^@/, '') : undefined;
  const displayName = profile?.displayName || profile?.display_name || undefined;

  return (
    <div className="w-full flex items-center gap-3">
      {avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarSrc}
          alt={cleanUsername || displayName || 'profile'}
          width={40}
          height={40}
          className="rounded-full object-cover w-10 h-10"
          onError={(e) => {
            try {
              const el = e.currentTarget as HTMLImageElement;
              const fallback = fallbackAddress ? `https://cdn.stamp.fyi/avatar/${fallbackAddress}?s=64` : '';
              if (fallback && el.src !== fallback) el.src = fallback;
            } catch {}
          }}
        />
      ) : null}
      <div>
        <div className="font-bold text-lg">{displayName || (cleanUsername ? `@${cleanUsername}` : `FID ${fid ?? ''}`)}</div>
        {cleanUsername && <div className="text-sm text-gray-500">@{cleanUsername}</div>}
      </div>
    </div>
  );
};

export interface ProfileCardProps {
  fid?: number;
  profile?: any;
  fallbackAddress?: string;
}

