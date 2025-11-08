
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Leaderboard', href: '/leaderboard', icon: '🏆' },
  { label: 'Challenge', href: '/farcaster-lookup', icon: '🎯' },
  { label: 'Info', href: '/info', icon: 'ℹ️' },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '64px',
      background: '#fff',
      borderTop: '1px solid #eee',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 100,
      paddingBottom: 'env(safe-area-inset-bottom)'
    }}>
      <div style={{ display: 'flex', flex: 1, justifyContent: 'space-around' }}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} legacyBehavior>
            <a
              aria-label={item.label}
              title={item.label}
              style={{
                color: pathname === item.href ? '#7C3AED' : '#333',
                fontWeight: pathname === item.href ? 'bold' : 'normal',
                textDecoration: 'none',
                fontSize: '1.5rem',
                textAlign: 'center',
                padding: '12px 0',
                minWidth: '72px',
                lineHeight: 1,
              }}
            >
              <span role="img" aria-hidden="true">{item.icon}</span>
            </a>
          </Link>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', paddingRight: '8px' }}>
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
            minHeight: '40px',
          }}
        >
          <img src="https://tip.md/badge.svg" alt="Tip in Crypto" height={20} />
        </a>
      </div>
    </nav>
  );
}
