
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
      bottom: '0',
      left: 0,
      right: 0,
      height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0))',
      background: '#fff',
      borderTop: '1px solid #eee',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
      boxSizing: 'border-box',
      overflowX: 'auto',
      paddingLeft: '8px',
      paddingRight: '8px'
    }}>
      <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', gap: '8px', flexWrap: 'nowrap', alignItems: 'center' }}>
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
                padding: '10px 8px',
                minWidth: '56px',
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
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
        .bottom-nav { -webkit-overflow-scrolling: touch; }
        .bottom-nav__link { font-size: 1.5rem; }

        /* Very small widths: shrink to 1.375rem */
        @media (max-width: 480px) {
          .bottom-nav { padding-left: 6px; padding-right: 6px; }
          .bottom-nav__link { font-size: 1.375rem; padding: 10px 6px; min-width: 52px; }
        }

        /* Extremely small (legacy devices) */
        @media (max-width: 360px) {
          .bottom-nav__link { font-size: 1.25rem; padding: 8px 6px; min-width: 48px; }
        }

        /* Larger screens: allow slightly wider touch targets */
        @media (min-width: 1024px) {
          .bottom-nav__link { min-width: 64px; }
        }
      `}</style>
    </nav>
  );
}
