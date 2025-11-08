import React from "react";
import { NeynarProfileCard } from "@neynar/react";

export const ProfileCard: React.FC<ProfileCardProps> = ({ fid }) => {
  if (!fid) return null;
  return (
    <div className="w-full">
      <NeynarProfileCard fid={fid} />
    </div>
  );
};

export interface ProfileCardProps {
  fid?: number;
}

