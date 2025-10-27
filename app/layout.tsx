import type { Metadata, Viewport } from "next";
export const renderMode = 'force-dynamic';
import "./globals.css";
import ThirdwebProvider from "@/components/ThirdwebProvider";
import WagmiProvider from "@/components/WagmiProvider";
import ClientOnlyWidgets from '@/components/ClientOnlyWidgets';
import FarcasterMiniAppReady from '@/components/FarcasterMiniAppReady';
import ClientServiceWorkerCleanup from '@/components/ClientServiceWorkerCleanup';
import BottomNav from '@/components/BottomNav';

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
        {/* Removed browser-specific service worker and cache cleanup script */}
        {/* Move Farcaster ready() script to the absolute top for reliability. */}
        {/* 2. Minimal critical CSS: immediately after meta tags for fast styling */}
        <style
          dangerouslySetInnerHTML={{
            __html: `:root{--background:#ffffff;--foreground:#2d1b2e}html,body{background:var(--background)!important;color:var(--foreground)!important;min-height:100%}h1,h2,h3{color:var(--foreground)!important}`,
          }}
        />
        {/* 3. Service worker cleanup and error detection scripts */}
        <script dangerouslySetInnerHTML={{
          __html: `try{if(typeof window!=='undefined'&&'serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){try{r.unregister();}catch(e){}});}).catch(function(){});}if(typeof window!=='undefined'&&window.caches&&caches.keys){caches.keys().then(function(names){names.forEach(function(n){try{caches.delete(n);}catch(e){}});}).catch(function(){});} }catch(e){};`
        }} />
        {/* Removed browser-specific asset reload and error detection script */}
        {/* 4. Service worker registration: last in <head>, only if enabled */}
        {/* Removed browser-specific service worker registration script */}
      </head>
      <body className="antialiased">
        {/* Global client-side error guards: catch unhandled promise rejections and window errors
            so third-party SDKs that reject during initialization don't break the whole app UI.
            This is a defensive measure for dev/preview environments; keep monitoring/logging
            properly in production (Sentry/monitoring configured server-side). */}
        <script dangerouslySetInnerHTML={{
          __html: `(function(){
            if(typeof window==='undefined') return;
            window.addEventListener('unhandledrejection', function(evt){
              try{
                console.warn('[unhandledrejection] prevented', evt.reason);
                // Prevent default so it doesn't surface as an uncaught exception
                if(evt && typeof evt.preventDefault === 'function') evt.preventDefault();
              }catch(e){console.error('error handling unhandledrejection', e)}
            });
            window.addEventListener('error', function(evt){
              try{
                // Log and allow the app to continue; important runtime errors should still be visible
                console.error('[window.error] caught', evt.message || evt.error || evt.filename || evt);
              }catch(e){console.error('error handling window.error', e)}
            });
          })();`
        }} />
        <WagmiProvider>
          <ThirdwebProvider>
            {/* Ensure the Farcaster miniapp hides its splash when the app is ready */}
            <FarcasterMiniAppReady />
            <ClientServiceWorkerCleanup />
            {children}
            {/* Bottom navigation tabs */}
            <div style={{ height: '56px' }} /> {/* Spacer for nav */}
            <BottomNav />
            {/* Client-only widgets (miniapp prompt, staking prompt, toaster) */}
            <ClientOnlyWidgets />
          </ThirdwebProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
