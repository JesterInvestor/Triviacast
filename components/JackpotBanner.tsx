"use client";

import React, { useEffect, useState } from "react";

type ActiveStats = {
  prizeUsd: string;
  endTimestamp: string;
  ticketsSoldCount?: number;
  ticketPrice?: number;
  activePlayers?: number;
  lastTicketPurchaseTxHash?: string;
};

function formatUsd(s: string) {
  try {
    const n = Number(s);
    if (!Number.isFinite(n)) return s;
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  } catch (e) {
    return s;
  }
}

export default function JackpotBanner() {
  const [data, setData] = useState<ActiveStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchStats() {
    const baseUrl = "https://api.megapot.io/api/v1/jackpot-round-stats/active";
    // Prefer public NEXT_PUBLIC var for client-side use
    const apiKey = process.env.NEXT_PUBLIC_MEGAPOT_API_KEY;
    const url = apiKey ? `${baseUrl}?apikey=${encodeURIComponent(apiKey)}` : baseUrl;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      setData(json as ActiveStats);
      setError(null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setData(null);
    }
  }

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 60_000); // refresh every minute
    return () => clearInterval(id);
  }, []);

  if (error) {
    return (
      <div className="w-full bg-[#FFDDE6] text-[#6b4460] px-4 py-2 text-sm">
        Jackpot data unavailable: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full bg-[#FFF5F7] text-[#6b4460] px-4 py-2 text-sm">Loading jackpot data…</div>
    );
  }

  const prize = formatUsd(data.prizeUsd || "0");
  const endTs = Number(data.endTimestamp) || 0;
  const endDate = endTs ? new Date(Number(data.endTimestamp)) : null;
  const endsAt = endDate ? endDate.toLocaleString() : "—";

  // Build message for marquee
  const parts = [
    `Megapot Prize: ${prize}`,
    `Ends: ${endsAt}`,
  ];
  if (typeof data.ticketsSoldCount !== "undefined") parts.push(`Tickets sold: ${data.ticketsSoldCount}`);
  if (typeof data.activePlayers !== "undefined") parts.push(`Active players: ${data.activePlayers}`);

  const message = parts.join(" — ");

  return (
    <div className="w-full bg-gradient-to-r from-pink-50 to-pink-100 border-b border-pink-200">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="overflow-hidden">
          <div
            className="whitespace-nowrap animate-marquee text-sm text-[#4b2435] font-medium"
            style={{ display: "inline-block" }}
            title={message}
          >
            {message}
            <span className="mx-4">•</span>
            {message}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0%);} 100% { transform: translateX(-50%);} }
        .animate-marquee { animation: marquee 20s linear infinite; }
      `}</style>
    </div>
  );
}
