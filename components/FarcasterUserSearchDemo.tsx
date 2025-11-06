"use client";

import { useState } from "react";

interface User {
  fid: number;
  username: string;
  display_name: string;
  pfp_url?: string;
}

// Mock data for demo purposes
const mockUsers: User[] = [
  {
    fid: 3,
    username: "dwr",
    display_name: "Dan Romero",
  },
  {
    fid: 2,
    username: "v",
    display_name: "Varun Srinivasan",
  },
  {
    fid: 1234,
    username: "neynar",
    display_name: "Neynar",
  }
];

const FarcasterUserSearchDemo = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredUsers = searchTerm.trim() 
    ? mockUsers.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.display_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value.trim()) {
      setLoading(true);
      setTimeout(() => setLoading(false), 500);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-3xl font-bold text-center mb-6" style={{ color: 'var(--brain-primary)' }}>
        Farcaster Lookup (Demo)
      </h1>
      <p className="text-sm text-center mb-4" style={{ color: 'var(--text-medium)' }}>
        Search for Farcaster users by username or display name
      </p>
      <input
        type="text"
        placeholder="Search for users..."
        value={searchTerm}
        onChange={handleChange}
        className="w-full px-4 py-3 mb-4 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#F4A6B7] focus:border-[#F4A6B7] transition"
      />
      {loading && (
        <div className="text-center py-5 text-gray-500 animate-pulse">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#F4A6B7] border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2">Searching...</p>
        </div>
      )}
      {!loading && filteredUsers.length === 0 && searchTerm.trim() !== "" && (
        <div className="text-center py-5 text-gray-500">
          No users found
        </div>
      )}
      <ul className="space-y-2 mt-6">
        {!loading && filteredUsers.map((user, index) => (
          <li
            key={user.fid}
            className="py-3 px-4 bg-white border border-gray-200 rounded-lg hover:bg-[#FFE4EC] hover:border-[#F4A6B7] transition-all duration-300 cursor-pointer hover:shadow-md transform hover:scale-[1.02]"
            style={{
              animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F4A6B7] to-[#DC8291] flex items-center justify-center text-white font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
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

export default FarcasterUserSearchDemo;
