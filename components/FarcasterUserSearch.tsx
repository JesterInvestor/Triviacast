"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface User {
  fid: number;
  username: string;
  display_name: string;
  pfp_url?: string;
}

interface SearchResult {
  users: User[];
}

const FarcasterUserSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/neynar/user?q=${encodeURIComponent(searchTerm)}&limit=10`);
        if (!res.ok) {
          throw new Error("Failed to fetch users");
        }
        const data: SearchResult = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        setError("Failed to fetch users. Please try again.");
        console.error("Error fetching users:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (searchTerm.trim()) {
      const debounce = setTimeout(() => {
        fetchUsers();
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-3xl font-bold text-center mb-6" style={{ color: 'var(--brain-primary)' }}>
        Farcaster Lookup
      </h1>
      <p className="text-sm text-center mb-4" style={{ color: 'var(--text-medium)' }}>
        Search for Farcaster users by username or display name
      </p>
      <input
        type="text"
        placeholder="Search for users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#F4A6B7] focus:border-[#F4A6B7] transition"
      />
      {loading && (
        <div className="text-center py-5 text-gray-500 animate-pulse">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#F4A6B7] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2">Searching...</p>
        </div>
      )}
      {error && (
        <div className="text-center py-3 px-4 mb-4 text-red-600 bg-red-50 rounded-lg border border-red-200 animate-[slideIn_0.3s_ease-out]">
          {error}
        </div>
      )}
      {!loading && !error && users.length === 0 && searchTerm.trim() !== "" && (
        <div className="text-center py-5 text-gray-500">
          No users found
        </div>
      )}
      <ul className="space-y-2 mt-6">
        {users.map((user, index) => (
          <li
            key={user.fid}
            className="py-3 px-4 bg-white border border-gray-200 rounded-lg hover:bg-[#FFE4EC] hover:border-[#F4A6B7] transition-all duration-300 cursor-pointer hover:shadow-md transform hover:scale-[1.02]"
            style={{
              animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
            }}
          >
            <div className="flex items-center gap-3">
              {user.pfp_url && (
                <Image
                  src={user.pfp_url}
                  alt={user.username}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              )}
              <div className="flex-1">
                <div>
                  <span className="font-bold" style={{ color: 'var(--text-dark)' }}>
                    @{user.username}
                  </span>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-medium)' }}>
                  {user.display_name}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default FarcasterUserSearch;
