"use client";

import { useEffect } from 'react';
import { useActiveAccount, useConnect } from 'thirdweb/react';
import { createWallet } from 'thirdweb/wallets';
import { client } from '@/lib/thirdwebClient';

// Best-effort auto-connect:
// - If an injected provider exists (MetaMask/Farcaster MiniApp), try it once per session.
// - Avoid prompting QR (WalletConnect) automatically.
export default function ThirdwebAutoConnect() {
  const account = useActiveAccount();
  const { connect } = useConnect();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (account) return; // already connected

    const attempted = sessionStorage.getItem('triviacast_tw_autoconnect');
    if (attempted) return;

    (async () => {
      try {
        // If an injected EIP-1193 provider exists, attempt MetaMask adapter connect
        const eth = (window as any).ethereum;
        if (eth) {
          try {
            await connect(createWallet('io.metamask'));
            sessionStorage.setItem('triviacast_tw_autoconnect', '1');
            return;
          } catch (_) {
            // Try Coinbase extension as a secondary injected path
            try {
              await connect(createWallet('com.coinbase.wallet'));
              sessionStorage.setItem('triviacast_tw_autoconnect', '1');
              return;
            } catch {
              // ignore
            }
          }
        }
        sessionStorage.setItem('triviacast_tw_autoconnect', '1');
      } catch {
        // no-op
      }
    })();
  }, [account, connect]);

  return null;
}
