import type { Metadata, Viewport } from "next";
export const dynamic = 'force-dynamic';
import "./globals.css";
import ThirdwebProvider from "@/components/ThirdwebProvider";
import WagmiProvider from "@/components/WagmiProvider";
import ClientOnlyWidgets from '@/components/ClientOnlyWidgets';

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
        {/* Minimal critical CSS to avoid a flash of unstyled content (FOUC).
            Keeps background and text color correct on first paint while full CSS loads.
            This is intentionally tiny and safe to keep as a fallback. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--background:#ffffff;--foreground:#2d1b2e}html,body{background:var(--background)!important;color:var(--foreground)!important;min-height:100%}h1,h2,h3{color:var(--foreground)!important}`,
          }}
        />
      </head>
      <body className="antialiased">
        <WagmiProvider>
          <ThirdwebProvider>
            {children}
            {/* Client-only widgets (miniapp prompt, staking prompt, toaster) */}
            <ClientOnlyWidgets />
          </ThirdwebProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
