import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThirdwebProvider from "@/components/ThirdwebProvider";
import FarcasterMiniAppReady from "@/components/FarcasterMiniAppReady";
import AddMiniAppPrompt from "@/components/AddMiniAppPrompt";

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
                console.log('[Triviacast] Inline fallback: starting import', Date.now());
                import('https://esm.sh/@farcaster/miniapp-sdk').then(({ sdk }) => {
                  console.log('[Triviacast] Inline fallback: calling ready()', Date.now());
                  sdk.actions.ready().then(() => {
                    console.log('[Triviacast] Inline fallback: ready() resolved', Date.now());
                  }).catch(() => {
                    console.log('[Triviacast] Inline fallback: ready() error (ignored)', Date.now());
                  });
                }).catch(() => {});
              } catch {}
            `,
          }}
        />
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
