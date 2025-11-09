import React, { useEffect, useMemo, useState } from "react";

// Example popular Farcaster usernames (fallback)
const popularAccounts = [
  "triviacast", "neynar", "farcaster", "v", "dwr", "jacob", "rish", "farcasterxyz", "0xkofi", "farcasterbot"
];

// Default curated FIDs if env not provided
const DEFAULT_CURATED_FIDS: number[] = [
  1158447,
  883378,
  892889,
  448074,
  460451,
  973141,
  1131072,
  1124007,
];

function parseCuratedFidsFromEnv(): number[] {
  try {
    const raw = (process.env.NEXT_PUBLIC_CURATED_FIDS || '').trim();
    if (!raw) return DEFAULT_CURATED_FIDS;
    const parts = raw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0);
    return parts.length ? parts : DEFAULT_CURATED_FIDS;
  } catch {
    return DEFAULT_CURATED_FIDS;
  }
}

export interface NeynarUserDropdownProps {
  value: string;
  onChange: (username: string) => void;
}

export default function NeynarUserDropdown({ value, onChange }: NeynarUserDropdownProps) {
  const [input, setInput] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [curated, setCurated] = useState<string[]>([]);

  // Load curated usernames from FIDs via API, with localStorage cache for 24h
  useEffect(() => {
    let cancelled = false;
    const cacheKey = 'triviacast.curatedUsernames.v1';
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.usernames) && typeof parsed.ts === 'number' && now - parsed.ts < dayMs) {
          setCurated(parsed.usernames);
        }
      }
    } catch {
      // ignore cache errors
    }

    (async () => {
      try {
        const fids = parseCuratedFidsFromEnv();
        if (!Array.isArray(fids) || fids.length === 0) return;
        const res = await fetch('/api/neynar/fids', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fids }),
        });
        if (!res.ok) throw new Error('Failed to fetch curated usernames');
        const data = await res.json();
        const usernames: string[] = [];
        if (data && data.result) {
          for (const key of Object.keys(data.result)) {
            const u = data.result[key];
            if (u?.username) usernames.push(String(u.username));
          }
        }
        const unique = Array.from(new Set(usernames.filter(Boolean)));
        if (!cancelled && unique.length) {
          setCurated(unique);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ usernames: unique, ts: now }));
          } catch {
            // ignore cache errors
          }
        }
      } catch {
        // swallow; fallback to static popularAccounts only
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const baseSuggestions = useMemo(() => {
    const merged = Array.from(new Set([...(curated || []), ...popularAccounts]));
    return merged;
  }, [curated]);

  const filtered = input
    ? baseSuggestions.filter(u => u.toLowerCase().includes(input.toLowerCase()))
    : baseSuggestions;

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={input}
        onChange={e => {
          setInput(e.target.value);
          setShowDropdown(true);
          onChange(e.target.value);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder="Search Farcaster username..."
        className="border p-2 rounded w-full"
        style={{ minWidth: '200px' }}
      />
      {showDropdown && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 bg-white border rounded shadow mt-1 z-10" style={{ maxHeight: '180px', overflowY: 'auto' }}>
          {filtered.map(u => (
            <li
              key={u}
              className="px-3 py-2 cursor-pointer hover:bg-blue-100"
              onMouseDown={() => {
                setInput(u);
                setShowDropdown(false);
                onChange(u);
              }}
            >
              @{u}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
