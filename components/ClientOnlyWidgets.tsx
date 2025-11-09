"use client";

import { useEffect, useState } from 'react';
import AddMiniAppPrompt from './AddMiniAppPrompt';
import StakingDailyClaimPrompt from './StakingDailyClaimPrompt';
import Toaster from './Toaster';
import ClientErrorBoundary from './ClientErrorBoundary';
import WalletIQPoints from './WalletIQPoints';
import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';

// Replace Thirdweb ConnectButton with a lightweight wagmi + WalletConnect based UI.
// This focuses on WalletConnect (QR modal) + injected wallets already configured
// in `wagmiConfig` (MetaMask, Farcaster Mini App provider shim, etc.).

export default function ClientOnlyWidgets() {
  const [MiniAppProviderComp, setMiniAppProviderComp] = useState<React.ComponentType<React.PropsWithChildren<unknown>> | null>(null);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, status } = useConnect();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const { disconnect } = useDisconnect();
  const [showSelector, setShowSelector] = useState(false);

  // Dynamically load optional Neynar MiniApp provider (same behavior as before)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await (eval('import("@neynar/react")') as Promise<unknown>);
        if (mounted && mod && (mod as any).MiniAppProvider) {
          setMiniAppProviderComp(() => (mod as any).MiniAppProvider as React.ComponentType<React.PropsWithChildren<unknown>>);
        }
      } catch {
        // optional dependency not available — ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Network mismatch toast: if connected chain differs from expected env chain
  useEffect(() => {
    const expected = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);
    if (!address || !chainId) return;
    if (expected && chainId !== expected) {
      try {
        window.dispatchEvent(
          new CustomEvent('triviacast:toast', {
            detail: { type: 'error', message: `Wrong network detected. Please switch to chain ${expected}.` },
          })
        );
      } catch {}
    }
  }, [address, chainId]);

  const primaryWalletConnect = connectors.find(c => c.id === 'walletConnect');

  function handlePrimaryConnect() {
    // Prefer WalletConnect for broad compatibility (Base mobile, etc.)
    const target = primaryWalletConnect || connectors[0];
    if (target) {
      setConnectingId(target.id);
      connect({ connector: target, chainId: undefined });
    } else {
      setShowSelector(true);
    }
  }

  const connectSection = (
    <div className="mb-4">
      {isConnected && address ? (
        <div className="flex items-center gap-3">
          <img
            src={`https://cdn.stamp.fyi/avatar/${address}?s=44`}
            alt="Avatar"
            className="rounded-full border-2 border-[#F4A6B7] w-11 h-11"
          />
          <div className="px-3 py-2 bg-[#FFE4EC] text-[#5a3d5c] rounded-lg text-sm border-2 border-[#F4A6B7] font-medium min-h-[44px] flex items-center gap-2">
            <span className="font-semibold">{`${address.slice(0,6)}…${address.slice(-4)}`}</span>
            <span className="ml-2 text-green-600 font-bold">Connected</span>
            <button
              onClick={() => disconnect()}
              className="ml-3 text-xs bg-white text-[#2d1b2e] px-2 py-1 rounded border border-[#F4A6B7] hover:bg-[#F4A6B7] hover:text-white transition"
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handlePrimaryConnect}
            disabled={status === 'pending'}
            className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-2 px-4 rounded-lg text-sm transition shadow disabled:opacity-60"
          >
            {status === 'pending' && connectingId ? `Connecting…` : 'Connect Wallet'}
          </button>
          <button
            onClick={() => setShowSelector(s => !s)}
            className="bg-white border-2 border-[#F4A6B7] text-[#5a3d5c] font-semibold py-2 px-4 rounded-lg text-sm hover:bg-[#FFE4EC] transition"
          >
            {showSelector ? 'Hide Options' : 'More Options'}
          </button>
        </div>
      )}
      {!isConnected && showSelector && (
        <div className="mt-3 grid gap-2">
          {connectors.map(c => (
            <button
              key={c.uid}
              disabled={status === 'pending'}
              onClick={() => { setConnectingId(c.id); connect({ connector: c, chainId: undefined }); }}
              className="w-full text-left px-3 py-2 rounded border-2 border-[#F4A6B7] bg-[#FFE4EC] hover:bg-[#FFC4D1] text-[#2d1b2e] text-sm font-medium disabled:opacity-50"
            >
              {c.name}{status === 'pending' && connectingId === c.id ? ' (connecting…)': ''}
            </button>
          ))}
          {connectors.length === 0 && (
            <div className="text-xs text-[#2d1b2e] italic">No connectors available. Ensure WalletConnect project ID is set.</div>
          )}
        </div>
      )}
    </div>
  );

  const content = (
    <>
  {connectSection}
  {/* iQ Points badge (hidden if no wallet or zero) */}
  <WalletIQPoints />
      <AddMiniAppPrompt />
      <StakingDailyClaimPrompt />
      <Toaster />
    </>
  );

  return (
    <ClientErrorBoundary>
      {MiniAppProviderComp ? (
        <MiniAppProviderComp>{content}</MiniAppProviderComp>
      ) : (
        content
      )}
    </ClientErrorBoundary>
  );
}
