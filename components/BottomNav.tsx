
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
    <nav className="bottom-nav" style={{
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
              className="bottom-nav__link"
              aria-label={item.label}
              title={item.label}
              style={{
                color: pathname === item.href ? '#7C3AED' : '#333',
                fontWeight: pathname === item.href ? 'bold' : 'normal',
                textDecoration: 'none',
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
      <style jsx>{`
        /* Base size */
        .bottom-nav__link { font-size: 1.5rem; }

        /* Very small widths: shrink to 1.375rem */
        @media (max-width: 360px) {
          .bottom-nav { padding-left: 8px; padding-right: 8px; }
          .bottom-nav__link { font-size: 1.375rem; padding: 10px 6px; min-width: 56px; }
        }

        /* Extremely small (legacy devices) */
        @media (max-width: 320px) {
          .bottom-nav__link { font-size: 1.25rem; padding: 8px 6px; min-width: 52px; }
        }
      `}</style>
    </nav>
  );
}
