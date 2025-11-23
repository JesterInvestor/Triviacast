"use client";

import Image from "next/image";
import ClientOnlyWidgets from "@/components/ClientOnlyWidgets";
import { openShareUrl, shareAppUrl } from '@/lib/farcaster';
import Quiz from "@/components/Quiz";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        {/* Top bar (wallet connect + share handled inside ClientOnlyWidgets) */}
        <div className="w-full flex items-center justify-end gap-2 mb-2 sm:mb-4">
          {/* Farcaster share logo (upper-right) */}
          <button
            aria-label="Share on Farcaster"
            title="Share Triviacast on Farcaster"
            onClick={async (e) => {
              e.preventDefault();
              try {
                void openShareUrl(shareAppUrl());
              } catch (err) {
                console.debug('[Share] openShareUrl failed', err);
                try {
                  // fallback to opening the canonical share link
                  window.open(shareAppUrl(), '_blank', 'noopener');
                } catch (err2) {
                  // last resort: navigate
                  window.location.href = shareAppUrl();
                }
              }
            }}
            className="inline-flex items-center justify-center rounded-full p-1 bg-white/80 hover:bg-white transition shadow">
            {/* Inline Farcaster-ish SVG mark */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 block" aria-hidden>
              <circle cx="12" cy="12" r="11" fill="#071427" />
              <path fill="#7AD0FF" d="M7.8 11.2c0-1.5 1.2-2.7 2.7-2.7h3.6c.3 0 .6.3.6.6v.9c0 .3-.3.6-.6.6h-3.6c-.9 0-1.5.6-1.5 1.5v.6c0 .9.6 1.5 1.5 1.5h3.6c.3 0 .6.3.6.6v.9c0 .3-.3.6-.6.6h-3.6c-1.5 0-2.7-1.2-2.7-2.7v-.9z" />
            </svg>
          </button>

          <ClientOnlyWidgets />
        </div>

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center gap-4 w-full">
          <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
            <Image
              src="/brain-large.svg"
              alt="Triviacast Brain"
              width={60}
              height={60}
              className="drop-shadow-lg sm:w-[60px] sm:h-[60px] mx-auto"
              priority
            />
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center">
              <h1 className="text-5xl sm:text-6xl font-extrabold text-[#2d1b2e] text-center">
                Triviacast
              </h1>
            </div>
          </div>

          {/* Short subtitle */}
          <p className="mt-2 text-sm text-[#5a3d5c] text-center max-w-xl">
            1)Play Quiz 2)If you like it, go to Quests🗺️ 3)Challenge Friend 🎯 4)Share your own Question ℹ️ If you hold 100,000 T points and 60 iQ you can play Megapot Jackpot
          </p>
        </div>

        {/* Main quiz */}
        <div className="w-full max-w-4xl">
          <Quiz />
        </div>

        {/* Farchess promo button (replaces Follow Triviacast) */}
        <div className="mt-8 w-full flex justify-center">
            <a
              href="#"
              onClick={async (e) => {
                e.preventDefault();
                const url = 'https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess';
                console.debug('[Farchess] click handler invoked');

                // Try known global SDKs first
                try {
                  const w = window as any;
                  const candidates = [w.sdk, w.farcasterSdk, w.farcasterMiniApp, w.__farcasterMiniApp, w.FarcasterMiniApp, w];
                  for (const c of candidates) {
                    if (!c) continue;
                    try {
                      const maybeSdk = c.sdk ? c.sdk : c;
                      if (maybeSdk && maybeSdk.actions) {
                        // Try a few possible action methods in order, with debug logs
                        if (typeof maybeSdk.actions.openMiniApp === 'function') {
                          console.debug('[Farchess] using maybeSdk.actions.openMiniApp');
                          void maybeSdk.actions.openMiniApp({ url });
                          return;
                        }
                        if (typeof maybeSdk.actions.launchMiniApp === 'function') {
                          console.debug('[Farchess] using maybeSdk.actions.launchMiniApp');
                          void maybeSdk.actions.launchMiniApp({ url });
                          return;
                        }
                        if (typeof maybeSdk.actions.launchFrame === 'function') {
                          console.debug('[Farchess] using maybeSdk.actions.launchFrame');
                          void maybeSdk.actions.launchFrame({ url });
                          return;
                        }
                        if (typeof maybeSdk.actions.launch === 'function') {
                          console.debug('[Farchess] using maybeSdk.actions.launch');
                          void maybeSdk.actions.launch({ type: 'launch_miniapp', url });
                          return;
                        }
                        if (typeof maybeSdk.actions.open === 'function') {
                          console.debug('[Farchess] using maybeSdk.actions.open');
                          void maybeSdk.actions.open({ url });
                          return;
                        }
                        if (typeof maybeSdk.actions.performAction === 'function') {
                          console.debug('[Farchess] using maybeSdk.actions.performAction');
                          void maybeSdk.actions.performAction({ type: 'launch_miniapp', url });
                          return;
                        }
                      }
                    } catch (err) {
                      console.debug('[Farchess] sdk global attempt threw', err);
                    }
                  }
                } catch (err) {
                  console.debug('[Farchess] global sdk check failed', err);
                }

                // Try dynamic import of the SDK (fast, with timeout)
                try {
                  const importPromise = import('@farcaster/miniapp-sdk').catch(() => null);
                  const mod = await Promise.race([importPromise, new Promise((res) => setTimeout(() => res(null), 600))]);
                  if (mod) {
                    const maybeSdk = (mod as any)?.sdk ?? (mod as any)?.default?.sdk ?? (mod as any)?.default ?? mod;
                    if (maybeSdk && maybeSdk.actions) {
                      if (typeof maybeSdk.actions.openMiniApp === 'function') {
                        console.debug('[Farchess] using imported sdk.actions.openMiniApp');
                        void maybeSdk.actions.openMiniApp({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.launchMiniApp === 'function') {
                        console.debug('[Farchess] using imported sdk.actions.launchMiniApp');
                        void maybeSdk.actions.launchMiniApp({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.launchFrame === 'function') {
                        console.debug('[Farchess] using imported sdk.actions.launchFrame');
                        void maybeSdk.actions.launchFrame({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.launch === 'function') {
                        console.debug('[Farchess] using imported sdk.actions.launch');
                        void maybeSdk.actions.launch({ type: 'launch_miniapp', url });
                        return;
                      }
                      if (typeof maybeSdk.actions.open === 'function') {
                        console.debug('[Farchess] using imported sdk.actions.open');
                        void maybeSdk.actions.open({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.performAction === 'function') {
                        console.debug('[Farchess] using imported sdk.actions.performAction');
                        void maybeSdk.actions.performAction({ type: 'launch_miniapp', url });
                        return;
                      }
                    }
                  }
                } catch (err) {
                  console.debug('[Farchess] dynamic import attempt failed', err);
                }

                // Try posting messages to parent window with several common shapes
                try {
                  console.debug('[Farchess] no SDK launch worked — trying postMessage fallbacks to parent');
                  if (window.parent && window.parent !== window) {
                    const msgs = [
                      { type: 'launch_miniapp', url },
                      { type: 'launch_frame', url },
                      { type: 'miniapp:launch', action: { type: 'launch_miniapp', url } },
                      { type: 'miniapp:open', url },
                      { type: 'miniapp:action', action: { type: 'launch_miniapp', url } },
                    ];
                    for (const m of msgs) {
                      try {
                        window.parent.postMessage(m, '*');
                        console.debug('[Farchess] posted message to parent', m);
                      } catch (err) {
                        console.debug('[Farchess] postMessage to parent failed for', m, err);
                      }
                    }
                    // allow the host a brief moment to handle the message
                    await new Promise((res) => setTimeout(res, 200));
                  }
                } catch (err) {
                  console.debug('[Farchess] postMessage fallbacks failed', err);
                }

                // As a final fallback, open the URL in a new tab/window
                try {
                  window.open('https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess', '_blank', 'noopener');
                } catch (err) {
                  console.debug('[Farchess] window.open failed, navigating', err);
                  // last resort: set location
                  window.location.href = 'https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess';
                }
              }}
              aria-label="Farchess - Play Chess earn $CHESS"
              title="Farchess - Play Chess earn $CHESS"
              className="relative inline-flex items-center gap-4 rounded-2xl p-[2px] bg-gradient-to-r from-sky-300 via-blue-500 to-blue-800 hover:scale-[1.02] transform transition-all duration-200"
            >
            {/* Logo - place the image at public/farchess.png so it can be served */}
            <div className="w-[72px] h-[72px] rounded-xl overflow-hidden bg-[#071427] flex-shrink-0 shadow-inner">
              <img src="/farchess.png" alt="Farchess logo" className="w-full h-full object-cover" />
            </div>

            <span className="block rounded-xl bg-gradient-to-br from-[#071427] to-[#0b2540] px-5 py-4 text-left shadow-inner w-full">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 h-6 text-sky-300 flex-shrink-0" aria-hidden>
                  <path fill="#7AD0FF" d="M12 2c-1.1 0-2 .9-2 2v1H8c-1.1 0-2 .9-2 2v1h12V7c0-1.1-.9-2-2-2h-2V4c0-1.1-.9-2-2-2z"/>
                  <path fill="#3BB0FF" d="M6 12v6h12v-6H6z"/>
                </svg>
                <div className="flex flex-col text-left">
                  <span className="text-sky-300 font-extrabold text-sm sm:text-base leading-tight">Farchess - Play Chess</span>
                  <span className="text-sky-200 text-xs sm:text-sm">earn $CHESS</span>
                </div>
              </div>
            </span>
          </a>
        </div>

        {/* Join Fellow Triviacasters button (now uses same launch logic) */}
        <div className="mt-4 w-full flex justify-center">
          <a
            href="#"
            onClick={async (e) => {
              e.preventDefault();
              const url = 'https://farcaster.xyz/~/group/vG63_ZR3i9CCRz9B-7CaRg';
              console.debug('[JoinGroup] click handler invoked');

              // Try known global SDKs first
              try {
                const w = window as any;
                const candidates = [w.sdk, w.farcasterSdk, w.farcasterMiniApp, w.__farcasterMiniApp, w.FarcasterMiniApp, w];
                for (const c of candidates) {
                  if (!c) continue;
                  try {
                    const maybeSdk = c.sdk ? c.sdk : c;
                    if (maybeSdk && maybeSdk.actions) {
                      if (typeof maybeSdk.actions.openMiniApp === 'function') {
                        console.debug('[JoinGroup] using maybeSdk.actions.openMiniApp');
                        void maybeSdk.actions.openMiniApp({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.launchMiniApp === 'function') {
                        console.debug('[JoinGroup] using maybeSdk.actions.launchMiniApp');
                        void maybeSdk.actions.launchMiniApp({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.launchFrame === 'function') {
                        console.debug('[JoinGroup] using maybeSdk.actions.launchFrame');
                        void maybeSdk.actions.launchFrame({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.launch === 'function') {
                        console.debug('[JoinGroup] using maybeSdk.actions.launch');
                        void maybeSdk.actions.launch({ type: 'launch_miniapp', url });
                        return;
                      }
                      if (typeof maybeSdk.actions.open === 'function') {
                        console.debug('[JoinGroup] using maybeSdk.actions.open');
                        void maybeSdk.actions.open({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.performAction === 'function') {
                        console.debug('[JoinGroup] using maybeSdk.actions.performAction');
                        void maybeSdk.actions.performAction({ type: 'launch_miniapp', url });
                        return;
                      }
                    }
                  } catch (err) {
                    console.debug('[JoinGroup] sdk global attempt threw', err);
                  }
                }
              } catch (err) {
                console.debug('[JoinGroup] global sdk check failed', err);
              }

              // Try dynamic import of the SDK (fast, with timeout)
              try {
                const importPromise = import('@farcaster/miniapp-sdk').catch(() => null);
                const mod = await Promise.race([importPromise, new Promise((res) => setTimeout(() => res(null), 600))]);
                if (mod) {
                  const maybeSdk = (mod as any)?.sdk ?? (mod as any)?.default?.sdk ?? (mod as any)?.default ?? mod;
                  if (maybeSdk && maybeSdk.actions) {
                    if (typeof maybeSdk.actions.openMiniApp === 'function') {
                      console.debug('[JoinGroup] using imported sdk.actions.openMiniApp');
                      void maybeSdk.actions.openMiniApp({ url });
                      return;
                    }
                    if (typeof maybeSdk.actions.launchMiniApp === 'function') {
                      console.debug('[JoinGroup] using imported sdk.actions.launchMiniApp');
                      void maybeSdk.actions.launchMiniApp({ url });
                      return;
                    }
                    if (typeof maybeSdk.actions.launchFrame === 'function') {
                      console.debug('[JoinGroup] using imported sdk.actions.launchFrame');
                      void maybeSdk.actions.launchFrame({ url });
                      return;
                    }
                    if (typeof maybeSdk.actions.launch === 'function') {
                      console.debug('[JoinGroup] using imported sdk.actions.launch');
                      void maybeSdk.actions.launch({ type: 'launch_miniapp', url });
                      return;
                    }
                    if (typeof maybeSdk.actions.open === 'function') {
                      console.debug('[JoinGroup] using imported sdk.actions.open');
                      void maybeSdk.actions.open({ url });
                      return;
                    }
                    if (typeof maybeSdk.actions.performAction === 'function') {
                      console.debug('[JoinGroup] using imported sdk.actions.performAction');
                      void maybeSdk.actions.performAction({ type: 'launch_miniapp', url });
                      return;
                    }
                  }
                }
              } catch (err) {
                console.debug('[JoinGroup] dynamic import attempt failed', err);
              }

              // Try posting messages to parent window with several common shapes
              try {
                console.debug('[JoinGroup] no SDK launch worked — trying postMessage fallbacks to parent');
                if (window.parent && window.parent !== window) {
                  const msgs = [
                    { type: 'launch_miniapp', url },
                    { type: 'launch_frame', url },
                    { type: 'miniapp:launch', action: { type: 'launch_miniapp', url } },
                    { type: 'miniapp:open', url },
                    { type: 'miniapp:action', action: { type: 'launch_miniapp', url } },
                  ];
                  for (const m of msgs) {
                    try {
                      window.parent.postMessage(m, '*');
                      console.debug('[JoinGroup] posted message to parent', m);
                    } catch (err) {
                      console.debug('[JoinGroup] postMessage to parent failed for', m, err);
                    }
                  }
                  await new Promise((res) => setTimeout(res, 200));
                }
              } catch (err) {
                console.debug('[JoinGroup] postMessage fallbacks failed', err);
              }

              // As a final fallback, open the URL in a new tab/window
              try {
                window.open(url, '_blank', 'noopener');
              } catch (err) {
                console.debug('[JoinGroup] window.open failed, navigating', err);
                window.location.href = url;
              }
            }}
            aria-label="Join Fellow Triviacasters"
            title="Join Fellow Triviacasters"
            className="inline-flex items-center justify-center gap-3 rounded-2xl px-6 py-3 bg-white/90 hover:bg-white transition-shadow shadow-md transform hover:scale-[1.01] duration-150"
          >
            <span className="font-extrabold text-[#2d1b2e] text-sm sm:text-base">Join Fellow Triviacasters</span>
          </a>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-gray-400 w-full">
          Triviacast © 2025. May your answers be quick and your points be plenty. Rocket fuel not included
        </footer>
      </div>
    </div>
  );
}
