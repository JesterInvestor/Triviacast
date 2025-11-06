"use client";

import FarcasterUserSearch from '@/components/FarcasterUserSearch';

export default function UserSearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <FarcasterUserSearch />
      </div>
    </div>
  );
}
