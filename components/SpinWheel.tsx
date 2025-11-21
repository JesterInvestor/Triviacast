"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAccount } from "wagmi";

type SpinResult = {
  success: boolean;
  tier?: string;
  prize?: number;
  error?: string;
};

export default function SpinWheel() {
  const { address, isConnected } = useAccount();
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement | null>(null);

  const doFetch = async (): Promise<SpinResult> => {
    try {
      let res: Response;
      try {
        const mod = await import("x402-fetch");
        const wagmiMod = await import("wagmi/actions");
        const walletClient = await (wagmiMod as any).getWalletClient?.();
        const fetchWithPayment = mod.wrapFetchWithPayment(fetch, walletClient);
        res = await fetchWithPayment("/api/jackpot", { method: "POST", body: JSON.stringify({ address }), headers: { "content-type": "application/json" } } as any);
      } catch (e) {
        res = await fetch("/api/jackpot", { method: "POST", body: JSON.stringify({ address }), headers: { "content-type": "application/json" } });
      }

      // If the server responds with 402, capture the X-PAYMENT header for debugging and UX
      if (res.status === 402) {
        const xPayment = res.headers.get("x-payment") || res.headers.get("X-PAYMENT");
        console.warn("/api/jackpot returned 402. X-PAYMENT:", xPayment);
        // Return a structured error so the UI can show a modal with instructions
        return { success: false, error: `payment_required`, prize: 0, tier: "none" } as SpinResult & { xPayment?: string };
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        return data;
      }
      const text = await res.text();
      return { success: false, error: `Non-JSON response (status ${res.status})` };
    } catch (err: any) {
      return { success: false, error: String(err) };
    }
  };

  const spin = async () => {
    if (!isConnected) return setMessage("Please connect your wallet to spin.");
    setMessage(null);
    setSpinning(true);

    // Start an initial animation (fast spin) while we call the API
    const base = rotation % 360;
    setRotation((r) => r + 360 * 3 + 60);

    const result = await doFetch();

    // If payment required, show a modal instructing the user
    if (!result.success && result.error === 'payment_required') {
      // Log and surface the instruction to the user
      setMessage('Payment required: please approve the 0.10 USDC payment in your wallet. If you do not see a prompt, ensure the site origin is allowlisted in the payment provider dashboard and your wallet popup is enabled.');
      setSpinning(false);
      return;
    }

    // Map server tier to final stop angle (so wheel lands on a corresponding label)
    const sectorAngles: Record<string, number> = {
      jackpot: 20, // small sector near 20deg
      medium: 140,
      small: 220,
      none: 300,
    };

    const tier = result.success ? (result.tier ?? "none") : "none";
    const target = sectorAngles[tier] ?? sectorAngles.none;

    // Ensure we spin several extra rounds and land on target
    const rounds = 6;
    const extra = rounds * 360 + target - (rotation % 360);
    // small randomness so it looks natural
    const jitter = Math.floor(Math.random() * 20) - 10;
    const finalAngle = rotation + extra + jitter;

    // trigger final spin
    requestAnimationFrame(() => setRotation(finalAngle));

    // Wait for animation to complete (match CSS transition duration)
    const waitMs = 4500;
    await new Promise((res) => setTimeout(res, waitMs));

    if (!result.success) {
      setMessage(`Error: ${result.error ?? 'unknown'}`);
    } else if (tier === 'none') {
      setMessage('No win this time — better luck next spin.');
    } else {
      setMessage(`You won ${result.prize} TRIV (${tier}) 🎉`);
    }

    setSpinning(false);
  };

  // Expose a debug helper on window so you can force the x402 payment flow from DevTools.
  // Usage in console: await window.__x402_retry()
  useEffect(() => {
    (window as any).__x402_retry = async () => {
      try {
        const mod = await import('x402-fetch');
        const wagmiMod = await import('wagmi/actions');
        const walletClient = await (wagmiMod as any).getWalletClient?.();
        const fetchWithPayment = mod.wrapFetchWithPayment(fetch, walletClient);
        const resp = await fetchWithPayment('/api/jackpot', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ address: walletClient?.account?.address })
        } as any);
        console.log('window.__x402_retry response status', resp.status);
        try { console.log('body:', await resp.json()); } catch (e) { console.log('text body:', await resp.text()); }
        return resp;
      } catch (err) {
        console.error('window.__x402_retry error', err);
        throw err;
      }
    };

    return () => { try { delete (window as any).__x402_retry; } catch (e) {} };
  }, []);

  return (
    <div className="w-full max-w-md mx-auto text-center">
      <div className="relative mx-auto" style={{ width: 280, height: 280 }}>
        <div
          ref={wheelRef}
          className="wheel"
          style={{
            width: 280,
            height: 280,
            borderRadius: '50%',
            border: '6px solid #f3f4f6',
            overflow: 'hidden',
            transform: `rotate(${rotation}deg)`,
            transition: 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1.0)'
          }}
        >
          {/* Simple ring with colored sectors */}
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <g transform="translate(50,50)">
              <path d="M0 0 L50 0 A50 50 0 0 1 15.45 47.55 Z" fill="#fee2e2" />
              <path d="M0 0 L15.45 47.55 A50 50 0 0 1 -40.45 29.39 Z" fill="#fef3c7" />
              <path d="M0 0 L-40.45 29.39 A50 50 0 0 1 -40.45 -29.39 Z" fill="#bbf7d0" />
              <path d="M0 0 L-40.45 -29.39 A50 50 0 0 1 15.45 -47.55 Z" fill="#bfdbfe" />
              <path d="M0 0 L15.45 -47.55 A50 50 0 0 1 50 0 Z" fill="#f3e8ff" />
              {/* Labels */}
              <text x="35" y="-5" transform="rotate(0)" fontSize={4} fill="#111">Lose</text>
              <text x="-5" y="40" transform="rotate(60)" fontSize={4} fill="#111">Small</text>
              <text x="-40" y="5" transform="rotate(120)" fontSize={4} fill="#111">Medium</text>
              <text x="-5" y="-42" transform="rotate(-60)" fontSize={4} fill="#111">Jackpot</text>
            </g>
          </svg>
        </div>

        {/* Pointer */}
        <div style={{ position: 'absolute', left: '50%', top: -8, transform: 'translateX(-50%)' }}>
          <div style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderBottom: '18px solid #ef4444' }} />
        </div>
      </div>

      <div className="mt-4">
        <button onClick={spin} disabled={spinning} className="px-4 py-2 bg-[#D1FAE5] rounded font-semibold">
          {spinning ? 'Spinning…' : 'Spin (0.10 USDC)'}
        </button>
      </div>

      {message && <div className="mt-3 text-sm">{message}</div>}

      <style jsx>{`
        .wheel { box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
      `}</style>
    </div>
  );
}
