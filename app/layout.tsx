import { Inter, Bangers } from "next/font/google";
import "./globals.css";
import ClientLayout from '@/components/ClientLayout';
import { Metadata } from 'next';

const inter = Inter({ subsets: ["latin"] });
const wacky = Bangers({ subsets: ["latin"], weight: "400", variable: "--font-wacky" });

// fc:miniapp / fc:frame meta tags for the site root so sharing https://triviacast.xyz
// renders a rich embed in Farcaster clients.
const miniappObj = {
  version: '1',
  imageUrl: 'https://triviacast.xyz/og-image1200x630.png',
  button: {
    title: 'Open Triviacast',
    action: {
      type: 'launch_frame',
      url: 'https://triviacast.xyz',
      name: 'Triviacast',
  splashImageUrl: 'https://triviacast.xyz/splash.png',
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
    images: [
      {
        url: 'https://triviacast.xyz/og-image1200x630.png',
        width: 1200,
        height: 630,
        alt: 'Triviacast promotional image showing the app logo and sample question',
      },
    ],
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
    <html lang="en" className={wacky.variable}>
      <body className={inter.className}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
