"use client";

import Image from "next/image";
import ClientOnlyWidgets from "@/components/ClientOnlyWidgets";
import Quiz from "@/components/Quiz";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        {/* Top bar (wallet connect + share handled inside ClientOnlyWidgets) */}
        <div className="w-full flex items-center justify-end gap-2 mb-2 sm:mb-4">
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
            1)Play Quiz 2)If you like it, go to Quests🗺️ 3)Challenge Friend 🎯 4)Cast your own Question ℹ️ Get 100,000 T points and 60 iQ to play $TRIV Jackpot
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
                // Try known global SDKs first
                try {
                  const w = window as any;
                  const candidates = [w.sdk, w.farcasterSdk, w.farcasterMiniApp, w.__farcasterMiniApp, w.FarcasterMiniApp, w];
                  for (const c of candidates) {
                    if (!c) continue;
                    try {
                      const maybeSdk = c.sdk ? c.sdk : c;
                      if (maybeSdk && maybeSdk.actions) {
                        // Try a few possible action methods in order
                        if (typeof maybeSdk.actions.launchMiniApp === 'function') {
                          void maybeSdk.actions.launchMiniApp({ url });
                          return;
                        }
                        if (typeof maybeSdk.actions.launchFrame === 'function') {
                          void maybeSdk.actions.launchFrame({ url });
                          return;
                        }
                        if (typeof maybeSdk.actions.launch === 'function') {
                          void maybeSdk.actions.launch({ type: 'launch_miniapp', url });
                          return;
                        }
                        if (typeof maybeSdk.actions.open === 'function') {
                          void maybeSdk.actions.open({ url });
                          return;
                        }
                        if (typeof maybeSdk.actions.performAction === 'function') {
                          void maybeSdk.actions.performAction({ type: 'launch_miniapp', url });
                          return;
                        }
                      }
                    } catch (e) {
                      // ignore and try next
                    }
                  }
                } catch (e) {
                  // ignore
                }

                // Try dynamic import of the SDK (fast, with timeout)
                try {
                  const importPromise = import('@farcaster/miniapp-sdk').catch(() => null);
                  const mod = await Promise.race([importPromise, new Promise((res) => setTimeout(() => res(null), 600))]);
                  if (mod) {
                    const maybeSdk = (mod as any)?.sdk ?? (mod as any)?.default?.sdk ?? (mod as any)?.default ?? mod;
                    if (maybeSdk && maybeSdk.actions) {
                      if (typeof maybeSdk.actions.launchMiniApp === 'function') {
                        void maybeSdk.actions.launchMiniApp({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.launchFrame === 'function') {
                        void maybeSdk.actions.launchFrame({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.launch === 'function') {
                        void maybeSdk.actions.launch({ type: 'launch_miniapp', url });
                        return;
                      }
                      if (typeof maybeSdk.actions.open === 'function') {
                        void maybeSdk.actions.open({ url });
                        return;
                      }
                      if (typeof maybeSdk.actions.performAction === 'function') {
                        void maybeSdk.actions.performAction({ type: 'launch_miniapp', url });
                        return;
                      }
                    }
                  }
                } catch (e) {
                  // ignore
                }

                // As a final fallback, open the URL in a new tab/window
                try {
                  window.open('https://farcaster.xyz/miniapps/DXCz8KIyfsme/farchess', '_blank', 'noopener');
                } catch (e) {
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

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-gray-400 w-full">
          Triviacast © 2025. May your answers be quick and your points be plenty. Rocket fuel not included
        </footer>
      </div>
    </div>
  );
}