import React, { useState } from "react";

// Example popular Farcaster usernames
const popularAccounts = [
  "dwr", "v", "rish", "jacob", "farcaster", "neynar", "triviacast", "farcasterxyz", "farcasterbot", "0xkofi"
];

export interface NeynarUserDropdownProps {
  value: string;
  onChange: (username: string) => void;
}

export default function NeynarUserDropdown({ value, onChange }: NeynarUserDropdownProps) {
  const [input, setInput] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = input
    ? popularAccounts.filter(u => u.toLowerCase().includes(input.toLowerCase()))
    : popularAccounts;

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
