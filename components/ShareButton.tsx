'use client';

import { openShareUrl } from '@/lib/farcaster';

interface ShareButtonProps {
  url: string;
  className?: string;
  ariaLabel?: string;
}

// Icon-only share button (standardized across pages)
export default function ShareButton({ url, className, ariaLabel }: ShareButtonProps) {
  return (
    <button
      onClick={() => openShareUrl(url)}
      className={className}
      aria-label={ariaLabel || 'Share on Farcaster'}
      type="button"
    >
      <img
        src="/farcaster.svg"
        alt="Farcaster"
        className="w-4 h-4"
        height={16}
      />
    </button>
  );
}
