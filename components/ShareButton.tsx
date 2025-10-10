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
      {children}
    </button>
  );
}
