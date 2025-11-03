import { Metadata } from 'next';

// fc:miniapp / fc:frame meta tags make this page embeddable in Farcaster clients.
// The content must be a JSON string with version, imageUrl and button.action details.
const miniappObj = {
  version: '1',
  imageUrl: 'https://triviacast.xyz/og-image.png',
  button: {
    title: 'Play Challenge',
    action: {
      type: 'launch_frame',
      url: 'https://triviacast.xyz/farcaster-lookup',
      name: 'Triviacast',
      splashImageUrl: 'https://triviacast.xyz/R11.png',
      splashBackgroundColor: '#FFE4EC',
    },
  },
} as const;

const miniapp = JSON.stringify(miniappObj);

export const metadata: Metadata = {
  title: 'Triviacast — Challenge a friend',
  description: 'Dare a friend: lookup their Farcaster handle, play a quiz, edit the preview, and post to challenge them.',
  openGraph: {
    title: 'Triviacast — Challenge a friend',
    description: 'Dare a friend: lookup their Farcaster handle, play a quiz, edit the preview, and post to challenge them.',
    images: ['https://triviacast.xyz/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
  other: {
    'fc:miniapp': miniapp,
  },
};

export default function FarcasterLookupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
