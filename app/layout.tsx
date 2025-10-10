import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThirdwebProvider from "@/components/ThirdwebProvider";
import FarcasterMiniAppReady from "@/components/FarcasterMiniAppReady";
import AddMiniAppPrompt from "@/components/AddMiniAppPrompt";

export const metadata: Metadata = {
  title: "Triviacast - Test Your Brain Power",
  description: "Test your knowledge with timed trivia questions. Challenge your brain with Triviacast on Farcaster!",
  icons: {
    icon: '/brain-small.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#F4A6B7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(
                    (registration) => {
                      console.log('SW registered:', registration);
                    },
                    (error) => {
                      console.log('SW registration failed:', error);
                    }
                  );
                });
              }
            `,
          }}
        />
        {/* Inline fallback: call Farcaster ready() ASAP before React hydrates */}
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                import('https://esm.sh/@farcaster/miniapp-sdk').then(({ sdk }) => {
                  sdk.actions.ready().catch(() => {});
                }).catch(() => {});
              } catch {}
            `,
          }}
        />
        {/* Farcaster Mini App embed for homepage */}
        <meta
          name="fc:miniapp"
          content='{"version":"1","imageUrl":"https://triviacast.xyz/og-image.png","button":{"title":"Play Triviacast","action":{"type":"launch_frame","name":"Triviacast","url":"https://triviacast.xyz/","splashImageUrl":"https://triviacast.xyz/icon.png","splashBackgroundColor":"#F4A6B7"}}}'
        />
        {/* Back-compat tag for some clients */}
        <meta
          name="fc:frame"
          content='{"version":"1","imageUrl":"https://triviacast.xyz/og-image.png","button":{"title":"Play Triviacast","action":{"type":"launch_frame","name":"Triviacast","url":"https://triviacast.xyz/","splashImageUrl":"https://triviacast.xyz/icon.png","splashBackgroundColor":"#F4A6B7"}}}'
        />

        {/* OpenGraph/Twitter for rich previews */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Triviacast" />
        <meta property="og:title" content="Triviacast - Test Your Brain" />
        <meta property="og:description" content="Play daily trivia, climb the leaderboard, and earn T Points. $TRIV airdrops for top players." />
        <meta property="og:image" content="https://triviacast.xyz/og-image.png" />
        <meta property="og:url" content="https://triviacast.xyz/" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Triviacast - Test Your Brain" />
        <meta name="twitter:description" content="Play daily trivia, climb the leaderboard, and earn T Points. $TRIV airdrops for top players." />
        <meta name="twitter:image" content="https://triviacast.xyz/og-image.png" />
      </head>
      <body className="antialiased">
        {/* Notify Farcaster Mini App host that UI is ready once mounted (mount early) */}
        <FarcasterMiniAppReady />
        <ThirdwebProvider>
          {children}
        </ThirdwebProvider>
        {/* Gentle prompt to add the app to user's Mini Apps list */}
        <AddMiniAppPrompt />
      </body>
    </html>
  );
}
