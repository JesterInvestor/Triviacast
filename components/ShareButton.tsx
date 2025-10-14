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
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
    </button>
  );
}
