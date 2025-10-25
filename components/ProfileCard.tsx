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

export default function ProfileCard({
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
}: ProfileCardProps) {
  return (
    <div className="bg-white border rounded-xl shadow p-4 flex flex-col items-center max-w-xs mx-auto">
      <img src={avatarImgUrl} alt={username} className="w-20 h-20 rounded-full mb-2 border-2 border-blue-400" />
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-lg">{displayName}</span>
        {hasPowerBadge && <span title="Power Badge" className="text-yellow-500">🪐</span>}
        {isOwnProfile && <span className="text-green-500 text-xs">(You)</span>}
      </div>
      <div className="text-gray-500 text-sm mb-2">@{username}</div>
      <div className="text-gray-700 text-center mb-2">{bio}</div>
      <div className="flex gap-4 mb-2">
        <span className="text-blue-600 font-semibold">{followers.toLocaleString()} <span className="text-xs text-gray-500">Followers</span></span>
        <span className="text-blue-600 font-semibold">{following.toLocaleString()} <span className="text-xs text-gray-500">Following</span></span>
      </div>
      {isFollowing && <div className="text-xs text-blue-500 mb-2">You follow this user</div>}
      {onCast && (
        <button onClick={onCast} className="bg-blue-500 text-white px-3 py-1 rounded mt-2">Cast</button>
      )}
    </div>
  );
}
