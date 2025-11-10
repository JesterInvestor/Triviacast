"use client";

import React from "react";

interface NeynarCastCardProps {
  identifier: string;
  renderEmbeds?: boolean;
  type?: "hash" | "url" | string;
}

// Small wrapper that prefers the official Neynar React CastCard when available.
// Falls back to a simple placeholder if the library isn't present at runtime.
export const NeynarCastCard: React.FC<NeynarCastCardProps> = ({ identifier, renderEmbeds = true, type = "hash" }) => {
  try {
    // Use a dynamic require to avoid bundler resolving this at build time if it's optional
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@neynar/react') as any;
    const RealCast = mod?.NeynarCastCard ?? mod?.CastCard ?? (mod?.default && mod.default.NeynarCastCard);
    if (RealCast) {
      return <RealCast identifier={identifier} renderEmbeds={renderEmbeds} type={type} />;
    }
  } catch (err) {
    // ignore and fall through to fallback UI
  }

  // Fallback UI (keeps markup consistent / minimal)
  return (
    <div className="bg-white border rounded-lg p-3 shadow">
      <div className="text-xs text-gray-500 mb-1">Cast: {identifier}</div>
      {renderEmbeds ? (
        <div className="text-xs text-gray-500">Embeds unavailable (Neynar client not loaded)</div>
      ) : null}
    </div>
  );
};

export default NeynarCastCard;
