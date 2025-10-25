export const ProfileCard: React.FC<ProfileCardProps> = ({
  avatarImgUrl,
  bio,
  displayName,
  followers,
  following,
  hasPowerBadge,
  isFollowing,
  isOwnProfile,
  onCast,
  username,
}) => (
  <div className="profile-card">
    <img src={avatarImgUrl} alt={`${displayName}'s avatar`} />
    <h2>{displayName} (@{username})</h2>
    <p>{bio}</p>
    <p>Followers: {followers} | Following: {following}</p>
    {hasPowerBadge && <span>🌟 Power Badge</span>}
    {isOwnProfile && <span>(You)</span>}
    {isFollowing && <span>Following</span>}
    {onCast && <button onClick={onCast}>Cast</button>}
  </div>
);
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

