import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThirdwebProvider from "@/components/ThirdwebProvider";
import WagmiProvider from "@/components/WagmiProvider";
import dynamic from 'next/dynamic';

const AddMiniAppPrompt = dynamic(() => import('@/components/AddMiniAppPrompt'), { ssr: false });
const StakingDailyClaimPrompt = dynamic(() => import('@/components/StakingDailyClaimPrompt'), { ssr: false });
const Toaster = dynamic(() => import('@/components/Toaster'), { ssr: false });

const frame = {
  version: "1",
  imageUrl: "https://triviacast.xyz/og-image.png",
  button: {
    title: "Play Triviacast",
    action: {
      type: "launch_miniapp",
      name: "Triviacast",
      url: "https://triviacast.xyz",
      splashImageUrl: "https://triviacast.xyz/icon.png",
      splashBackgroundColor: "#F4A6B7"
    }
  }
};

export const metadata: Metadata = {
  title: {
    default: "Triviacast - Test Your Brain Power",
    template: "%s | Triviacast",
  },
  description: "Test your knowledge with timed trivia questions. Challenge your brain with Triviacast on Farcaster!",
  icons: {
    icon: '/brain-small.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'Triviacast',
  },
  twitter: {
    card: 'summary_large_image',
  },
  other: {
    "fc:miniapp": JSON.stringify(frame),
    "fc:frame": JSON.stringify(frame)
  }
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
        {/* Move Farcaster ready() script to the absolute top for reliability */}
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
      </head>
      <body className="antialiased">
        <WagmiProvider>
          <ThirdwebProvider>
            {children}
          </ThirdwebProvider>
        </WagmiProvider>
        {/* Gentle prompt to add the app to user's Mini Apps list */}
        <AddMiniAppPrompt />
  {/* Prompt for staking and daily claim inside Farcaster miniapp */}
  <StakingDailyClaimPrompt />
  {/* Global toaster for notifications */}
  <Toaster />
      </body>
    </html>
  );
}
