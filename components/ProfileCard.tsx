import React from "react";

export interface ProfileCardProps {
  avatarImgUrl: string;
  bio: string;
  displayName: string;
  followers: number;
  following: number;
  hasPowerBadge?: boolean;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
  onCast?: () => void;
  username: string;
}

