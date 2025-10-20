"use client";

import { useEffect } from 'react';

export default function ClientServiceWorkerCleanup(): null {
  useEffect(() => {
    try {
      // Unregister any service workers that might be serving stale _next assets
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const r of regs) {
            try {
              r.unregister();
            } catch (e) {
              // ignore
            }
          }
        }).catch(() => {});
      }

      // Force a single reload to fetch latest assets; protect with a localStorage flag so we don't loop
      const key = '__triviacast_sw_reload_v1';
      if (!localStorage.getItem(key)) {
        setTimeout(() => {
          try {
            localStorage.setItem(key, '1');
            // Reload once to pick up new /_next assets
            window.location.reload();
          } catch (e) {
            // ignore
          }
        }, 500);
      }
    } catch (e) {
      // ignore any errors
    }
  }, []);

  return null;
}
