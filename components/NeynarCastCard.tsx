"use client";

import React, { useEffect, useState } from "react";

interface NeynarCastCardProps {
  identifier: string;
  renderEmbeds?: boolean;
  type?: "hash" | "url" | string;
}

// Client-side wrapper that dynamically imports the optional `@neynar/react` package.
// This avoids bundling or using `require()` which is flagged by the linter/build.
export const NeynarCastCard: React.FC<NeynarCastCardProps> = ({ identifier, renderEmbeds = true, type = "hash" }) => {
  const [RealCast, setRealCast] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const mod = await import("@neynar/react");
        const Comp = (mod as any)?.NeynarCastCard ?? (mod as any)?.CastCard ?? ((mod as any)?.default && (mod as any).default.NeynarCastCard);
        if (mounted && Comp) setRealCast(() => Comp);
      } catch (err) {
        // If the optional package isn't installed, we simply keep the fallback UI.
        // Do not rethrow — this is an optional runtime enhancement.
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (RealCast) {
    return <RealCast identifier={identifier} renderEmbeds={renderEmbeds} type={type} />;
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
