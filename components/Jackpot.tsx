"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";

export default function Jackpot() {
  const { address, isConnected } = useAccount();
  const [jackpot, setJackpot] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/jackpot")
      .then((r) => r.json())
      .then((d) => {
        if (d && d.jackpot) setJackpot(d.jackpot);
      })
      .catch(() => {});
  }, []);

  const spin = async () => {
    if (!isConnected) return alert("Connect your wallet to spin the jackpot");
    setLoading(true);
    setResult(null);
    try {
      // Try to use x402 client wrapper if available, otherwise plain fetch
      let res: Response;
      try {
        const mod = await import("x402-fetch");
        const wagmiMod = await import("wagmi/actions");
        // getWalletClient expects arguments in some typings; call dynamically to avoid build-time type check errors
        const walletClient = await (wagmiMod as any).getWalletClient?.();
        const fetchWithPayment = mod.wrapFetchWithPayment(fetch, walletClient);
        res = await fetchWithPayment("/api/jackpot", { method: "POST", body: JSON.stringify({ address }), headers: { "content-type": "application/json" } } as any);
      } catch (e) {
        // fallback to direct fetch; if middleware replies 402 the client must handle it
        res = await fetch("/api/jackpot", { method: "POST", body: JSON.stringify({ address }), headers: { "content-type": "application/json" } });
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ success: false, error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 w-full max-w-2xl text-left">
      <div className="p-6 rounded-xl bg-white/90 border border-[#D6F5E3] shadow-sm text-gray-900">
        <h3 className="text-lg font-semibold mb-2">TRIV Jackpot</h3>
        <p className="text-sm text-gray-700 mb-3">Jackpot: <strong>{jackpot ?? "—"} TRIV</strong></p>
        <p className="text-sm text-gray-700 mb-3">Cost per spin: <strong>0.10 USDC</strong></p>
        <div className="flex gap-2">
          <button disabled={loading} onClick={spin} className="px-4 py-2 bg-[#D1FAE5] rounded font-semibold">Spin</button>
        </div>
        {loading && <div className="mt-3 text-sm">Processing...</div>}
        {result && (
          <div className="mt-3 text-sm">
            {result.success ? (
              result.tier && result.tier !== "none" ? (
                <div className="text-green-700">Congratulations! You won {result.prize} TRIV ({result.tier}) 🎉</div>
              ) : (
                <div className="text-gray-700">No win this time — better luck next spin.</div>
              )
            ) : (
              <div className="text-red-700">Error: {String(result.error)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
