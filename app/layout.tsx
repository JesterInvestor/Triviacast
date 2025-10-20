import type { Metadata, Viewport } from "next";
export const renderMode = 'force-dynamic';
import "./globals.css";
import ThirdwebProvider from "@/components/ThirdwebProvider";
import WagmiProvider from "@/components/WagmiProvider";
import ClientOnlyWidgets from '@/components/ClientOnlyWidgets';
import FarcasterMiniAppReady from '@/components/FarcasterMiniAppReady';
import ClientServiceWorkerCleanup from '@/components/ClientServiceWorkerCleanup';

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
        {/* Immediate, non-module script to aggressively clear service workers and caches before assets load.
            This runs very early to help clients stuck with stale service workers that cause hashed-asset 404s. */}
        <script dangerouslySetInnerHTML={{
          __html: `try{if(typeof window!=='undefined'&&'serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){try{r.unregister();}catch(e){}});}).catch(function(){});}if(typeof window!=='undefined'&&window.caches&&caches.keys){caches.keys().then(function(names){names.forEach(function(n){try{caches.delete(n);}catch(e){}});}).catch(function(){});} }catch(e){};`
        }} />
        {/* Move Farcaster ready() script to the absolute top for reliability.
            This script is defensive: it attempts multiple ways to access the
            miniapp SDK (global injection, local package, CDN) and logs which
            method succeeded or failed. Desktop webviews sometimes block CDN
            ESM imports or don't inject the same globals as mobile, so this
            gives better compatibility and diagnostics. */}
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: `
              (async function() {
                function safeLog(...args) {
                  try { console.debug('[farcaster-ready]', ...args); } catch {}
                }

                // 1) If the SDK is already present on window, use it
                try {
                  const globalSdk = (window as any).sdk || (window as any).Farcaster?.sdk;
                  if (globalSdk && globalSdk.actions && typeof globalSdk.actions.ready === 'function') {
                    safeLog('Using global SDK');
                    try {
                      // Call ready() if available. We no longer gate on isInMiniApp so
                      // the same behavior applies across devices; failures are ignored.
                      await globalSdk.actions.ready(); safeLog('ready() succeeded (global)'); return;
                    } catch(e){ safeLog('ready() failed (global)', e); }
                  }
                } catch (e) { safeLog('global check failed', e); }

                // 2) Try to dynamically import the installed package (works when bundler exposes it)
                try {
                  const mod = await import('@farcaster/miniapp-sdk');
                  const sdk = (mod && mod.sdk) || mod.default?.sdk || mod.default;
                  if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
                    safeLog('Using local package import');
                    try {
                      // Don't gate on isInMiniApp; call ready() when available.
                      await sdk.actions.ready(); safeLog('ready() succeeded (local import)'); return;
                    } catch(e){ safeLog('ready() failed (local import)', e); }
                  }
                } catch (e) { safeLog('local package import failed', e); }

                // 3) Try CDN fallback (may be blocked by desktop webviews/CSP)
                try {
                  const mod = await import('https://esm.sh/@farcaster/miniapp-sdk');
                  const sdk = (mod && mod.sdk) || mod.default?.sdk || mod.default;
                  if (sdk && sdk.actions && typeof sdk.actions.ready === 'function') {
                    safeLog('Using CDN import');
                    try {
                      // Don't gate on isInMiniApp; call ready() when available.
                      await sdk.actions.ready(); safeLog('ready() succeeded (CDN)'); return;
                    } catch(e){ safeLog('ready() failed (CDN)', e); }
                  }
                } catch (e) { safeLog('CDN import failed', e); }

                // If we reached here, none of the strategies worked.
                safeLog('Farcaster SDK ready() could not be invoked. If this is a desktop host, check webview CSP and that the SDK is exposed to the page.');
              })();
            `,
          }}
        />
          {/*
            Inline early-error detector: watches for failed resource loads (404s) for /_next/static
            or hashed JS/CSS files. When such an error is detected, aggressively clear caches and
            unregister service workers, then force a single reload so the browser fetches current assets.
            The operation is guarded by a localStorage flag to avoid reload loops.
          */}
          <script dangerouslySetInnerHTML={{ __html: `
            (function(){
              try{
                var key = '__triviacast_asset_reload_v1';
                if (localStorage.getItem(key)) return;
                var triggered = false;
                function doCleanup(){
                  if (triggered) return; triggered = true;
                  try{
                    var finalize = function(){
                      try{ localStorage.setItem(key, Date.now().toString()); }catch(e){}
                      try{ window.location.reload(); }catch(e){}
                    };
                    // delete all caches if available
                    if (window.caches && caches.keys){
                      caches.keys().then(function(names){
                        return Promise.all(names.map(function(n){ return caches.delete(n); }));
                      }).finally(function(){
                        if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
                          navigator.serviceWorker.getRegistrations().then(function(rs){
                            return Promise.all(rs.map(function(r){ return r.unregister(); }));
                          }).finally(finalize);
                        } else finalize();
                      });
                    } else if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations){
                      navigator.serviceWorker.getRegistrations().then(function(rs){
                        return Promise.all(rs.map(function(r){ return r.unregister(); }));
                      }).finally(finalize);
                    } else {
                      finalize();
                    }
                  }catch(e){}
                }

                window.addEventListener('error', function(ev){
                  try{
                    var target = ev && ev.target || ev && ev.srcElement;
                    var url = (target && (target.src || target.href)) || (ev && ev.message) || '';
                    if (!url) return;
                    if (typeof url === 'string' && (url.indexOf('/_next/static') !== -1 || /\.[0-9a-f]{6,}\.(js|css)($|\?)/i.test(url))){
                      doCleanup();
                    }
                  }catch(e){}
                }, true);

                // Also watch for fetch failures surfaced as unhandled rejections
                window.addEventListener('unhandledrejection', function(ev){
                  try{
                    var r = ev && ev.reason;
                    var msg = r && r.message || '';
                    if (typeof msg === 'string' && msg.indexOf('/_next/static') !== -1) doCleanup();
                  }catch(e){}
                });
              }catch(e){}
            })();
          ` }} />
        {process.env.NEXT_PUBLIC_ENABLE_SW === '1' ? (
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
        ) : null}
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
            {/* Ensure the Farcaster miniapp hides its splash when the app is ready */}
            <FarcasterMiniAppReady />
            <ClientServiceWorkerCleanup />
            {children}
            {/* Client-only widgets (miniapp prompt, staking prompt, toaster) */}
            <ClientOnlyWidgets />
          </ThirdwebProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
