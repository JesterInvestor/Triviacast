
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Leaderboard', href: '/leaderboard', icon: '🏆' },
  { label: 'Challenge', href: '/farcaster-lookup', icon: '🎯' },
  { label: 'Quests', href: '/quests', icon: '🗺️' },
  { label: 'Jackpot', href: '/jackpot', icon: '💰' },
  { label: 'Info', href: '/info', icon: 'ℹ️' }, // keep Info at far right by ordering last
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
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: '12px',
      paddingRight: '12px'
    }}>
      <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', gap: '8px' }}>
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
                padding: '12px 8px',
                minWidth: '64px',
                lineHeight: 1,
              }}
            >
              <span role="img" aria-hidden="true">{item.icon}</span>
            </a>
          </Link>
        ))}
      </div>
      {/* No right-side buttons; nav items include all routes and Info is on far right */}
    </nav>
  );
}
