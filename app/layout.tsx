import "./globals.css";
import ClientLayout from '@/components/ClientLayout';
import { Metadata } from 'next';

// Using system fonts as fallback for build environment
const inter = { className: "" };

// fc:miniapp / fc:frame meta tags for the site root so sharing https://triviacast.xyz
// renders a rich embed in Farcaster clients.
const miniappObj = {
  version: '1',
  imageUrl: 'https://triviacast.xyz/og-image.png',
  button: {
    title: 'Open Triviacast',
    action: {
      type: 'launch_frame',
      url: 'https://triviacast.xyz',
      name: 'Triviacast',
      splashImageUrl: 'https://triviacast.xyz/R11.png',
      splashBackgroundColor: '#FFE4EC',
    },
  },
} as const;

const miniapp = JSON.stringify(miniappObj);

export const metadata: Metadata = {
  title: 'Triviacast — Test your brain',
  description: 'Trivia quiz mini-game — challenge friends, earn T Points, and share your results.',
  openGraph: {
    title: 'Triviacast — Test your brain',
    description: 'Trivia quiz mini-game — challenge friends, earn T Points, and share your results.',
    images: ['https://triviacast.xyz/hero-1200x630.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
  other: {
    'fc:miniapp': miniapp,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
