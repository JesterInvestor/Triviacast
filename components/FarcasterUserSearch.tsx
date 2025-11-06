"use client";

import { useState, useEffect } from "react";

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
      fetchUsers();
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-3xl font-bold text-center mb-6" style={{ color: 'var(--brain-primary)' }}>
        Farcaster Lookup
      </h1>
      <input
        type="text"
        placeholder="Search for users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#F4A6B7] focus:border-[#F4A6B7] transition"
      />
      {loading && (
        <div className="text-center py-5 text-gray-500">
          Loading...
        </div>
      )}
      {error && (
        <div className="text-center py-3 px-4 mb-4 text-red-600 bg-red-50 rounded-lg">
          {error}
        </div>
      )}
      <ul className="space-y-2 mt-6">
        {users.map((user) => (
          <li
            key={user.fid}
            className="py-3 px-4 bg-white border border-gray-200 rounded-lg hover:bg-[#FFE4EC] transition-colors duration-300 cursor-pointer"
          >
            <span className="font-bold" style={{ color: 'var(--text-dark)' }}>
              {user.username}
            </span>
            {" "}-{" "}
            <span style={{ color: 'var(--text-medium)' }}>
              {user.display_name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FarcasterUserSearch;
