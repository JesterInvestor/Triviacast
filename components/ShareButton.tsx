'use client';

import { openShareUrl } from '@/lib/farcaster';

interface ShareButtonProps {
  url: string;
  children?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export default function ShareButton({ url, children, className, ariaLabel }: ShareButtonProps) {
  return (
    <button
      onClick={() => openShareUrl(url)}
      className={className}
      aria-label={ariaLabel}
    >
      {children ?? (
        <img
          src="/farcaster.svg"
          alt="Share on Farcaster"
          className="w-4 h-4"
          height={16}
        />
      )}
    </button>
  );
}
