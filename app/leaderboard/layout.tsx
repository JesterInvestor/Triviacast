import { Metadata } from 'next';

// fc:miniapp meta for leaderboard page — used by Farcaster clients to render embeds
const miniappObj = {
  version: '1',
  imageUrl: 'https://triviacast.xyz/og-image-1200x630.png',
  button: {
    title: 'View Leaderboard',
    action: {
      type: 'launch_frame',
      url: 'https://triviacast.xyz/leaderboard',
      name: 'Triviacast',
      splashImageUrl: 'https://triviacast.xyz/splash-200.png',
      splashBackgroundColor: '#FFE4EC',
    },
  },
} as const;

const miniapp = JSON.stringify(miniappObj);

export const metadata: Metadata = {
  title: 'Triviacast — Leaderboard',
  description: 'Top Brain Power Rankings — see who leads the Triviacast leaderboard.',
  openGraph: {
    title: 'Triviacast — Leaderboard',
    description: 'Top Brain Power Rankings — see who leads the Triviacast leaderboard.',
    images: ['https://triviacast.xyz/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
  other: {
    'fc:miniapp': miniapp,
  },
};

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
