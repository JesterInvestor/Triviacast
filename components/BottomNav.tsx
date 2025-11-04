
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { shareAppUrl } from '@/lib/farcaster';
import ShareButton from '@/components/ShareButton';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Challenge', href: '/farcaster-lookup' },
  { label: 'Info', href: '/info' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '56px',
      background: '#fff',
      borderTop: '1px solid #eee',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around' }}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} legacyBehavior>
            <a style={{
              color: pathname === item.href ? '#0070f3' : '#333',
              fontWeight: pathname === item.href ? 'bold' : 'normal',
              textDecoration: 'none',
              fontSize: '1rem',
              textAlign: 'center',
              padding: '8px 0',
              minWidth: '80px',
            }}>{item.label}</a>
          </Link>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', paddingRight: '8px' }}>
        <ShareButton
          url={shareAppUrl()}
          ariaLabel="Share app"
          className="bg-[#DC8291] text-white rounded-lg px-3 py-2 shadow min-h-[36px] inline-flex items-center gap-1"
        >
          <img src="/farcaster.svg" alt="Farcaster" className="w-4 h-4" height={16} />
          <span className="text-sm font-semibold">Share</span>
        </ShareButton>
        <a
          href="https://tip.md/jesterinvestor"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Tip in Crypto"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            border: '2px solid #F4A6B7',
            background: '#fff',
            borderRadius: '8px',
            padding: '4px 6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            minHeight: '36px',
          }}
        >
          <img src="https://tip.md/badge.svg" alt="Tip in Crypto" height={20} />
        </a>
      </div>
    </nav>
  );
}
