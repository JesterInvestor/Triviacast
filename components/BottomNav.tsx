
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Farcaster Lookup', href: '/farcaster-lookup' },
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
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 100,
    }}>
      {navItems.map(item => (
        <Link key={item.href} href={item.href} legacyBehavior>
          <a style={{
            color: pathname === item.href ? '#0070f3' : '#333',
            fontWeight: pathname === item.href ? 'bold' : 'normal',
            textDecoration: 'none',
            fontSize: '1rem',
            flex: 1,
            textAlign: 'center',
            padding: '8px 0',
          }}>{item.label}</a>
        </Link>
      ))}
    </nav>
  );
}
