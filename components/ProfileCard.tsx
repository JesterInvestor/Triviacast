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
  // Fetch Farcaster profile info from Neynar based on username
  // ...existing code...
}

// Move hooks inside function body
export default function ProfileCard(props: ProfileCardProps) {
  const {
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
  } = props;

  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    fetch(`/api/farcaster/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      import React, { useEffect, useState } from "react";

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

      interface FarcasterProfile {
        pfpUrl?: string;
        bio?: string;
        displayName?: string;
        username?: string;
        followers?: number;
        following?: number;
        hasPowerBadge?: boolean;
        isFollowing?: boolean;
        isOwnProfile?: boolean;
      }

      const ProfileCard: React.FC<ProfileCardProps> = ({
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
      }) => {
        const [profile, setProfile] = useState<FarcasterProfile | null>(null);
        const [loading, setLoading] = useState<boolean>(false);
        const [error, setError] = useState<string | null>(null);

        useEffect(() => {
          if (!username) return;
          setLoading(true);
          setError(null);
          setProfile(null);
          fetch(`/api/farcaster/profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username }),
          })
            .then(async (res) => {
              const data = await res.json();
              if (!res.ok || !data.found || !data.profile) {
                setError(data.error || 'Profile not found');
              } else {
                setProfile(data.profile);
              }
            })
            .catch(() => setError('Failed to fetch profile'))
            .finally(() => setLoading(false));
        }, [username]);

        if (loading) {
          return (
            <div className="bg-white border rounded-xl shadow p-4 flex flex-col items-center max-w-xs mx-auto">
              <div className="animate-pulse w-20 h-20 rounded-full bg-blue-100 mb-2" />
              <div className="text-blue-600 font-bold">Loading profile...</div>
            </div>
          );
        }
        if (error) {
          return (
            <div className="bg-white border rounded-xl shadow p-4 flex flex-col items-center max-w-xs mx-auto">
              <div className="text-red-600 font-bold">{error}</div>
            </div>
          );
        }
        if (!profile) return null;

        return (
          <div className="bg-white border rounded-xl shadow p-4 flex flex-col items-center max-w-xs mx-auto">
            <img src={profile.pfpUrl || avatarImgUrl} alt={profile.username || username} className="w-20 h-20 rounded-full mb-2 border-2 border-blue-400" />
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg">{profile.displayName || profile.username || displayName}</span>
              {profile.hasPowerBadge && <span title="Power Badge" className="text-yellow-500">🪐</span>}
              {isOwnProfile && <span className="text-green-500 text-xs">(You)</span>}
            </div>
            <div className="text-gray-500 text-sm mb-2">@{profile.username || username}</div>
            <div className="text-gray-700 text-center mb-2">{profile.bio || bio}</div>
            <div className="flex gap-4 mb-2">
              <span className="text-blue-600 font-semibold">{(profile.followers ?? followers).toLocaleString()} <span className="text-xs text-gray-500">Followers</span></span>
              <span className="text-blue-600 font-semibold">{(profile.following ?? following).toLocaleString()} <span className="text-xs text-gray-500">Following</span></span>
            </div>
            {profile.isFollowing && <div className="text-xs text-blue-500 mb-2">You follow this user</div>}
            {onCast && (
              <button onClick={onCast} className="bg-blue-500 text-white px-3 py-1 rounded mt-2">Cast</button>
            )}
          </div>
        );
      };

      export default ProfileCard;
