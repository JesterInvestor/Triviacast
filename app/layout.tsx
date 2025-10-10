import type { Metadata, Viewport } from "next";
import "./globals.css";
import ThirdwebProvider from "@/components/ThirdwebProvider";
import FarcasterMiniAppReady from "@/components/FarcasterMiniAppReady";

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
        {/* Farcaster Mini App embed for homepage */}
        <meta
          name="fc:miniapp"
          content='{"version":"1","imageUrl":"https://triviacast.xyz/og-image.png","button":{"title":"Play Triviacast","action":{"type":"launch_frame","name":"Triviacast","url":"https://triviacast.xyz/","splashImageUrl":"https://triviacast.xyz/brain-small.svg","splashBackgroundColor":"#F4A6B7"}}}'
        />
      </head>
      <body className="antialiased">
        <ThirdwebProvider>
          {/* Notify Farcaster Mini App host that UI is ready once mounted */}
          <FarcasterMiniAppReady />
          {children}
        </ThirdwebProvider>
      </body>
    </html>
  );
}
