import React from "react";

interface NeynarCastCardProps {
  identifier: string;
  renderEmbeds?: boolean;
  type?: string;
}

export const NeynarCastCard: React.FC<NeynarCastCardProps> = ({ identifier, renderEmbeds, type }) => {
  // Placeholder: Replace with actual Neynar embed logic if available
  return (
    <div className="bg-white border rounded-lg p-3 shadow">
      <div className="text-xs text-gray-500 mb-1">Cast: {identifier}</div>
      {/* If you have Neynar embed logic, render it here */}
      {renderEmbeds && <div className="text-xs text-blue-500">[Embeds would render here]</div>}
    </div>
  );
};
