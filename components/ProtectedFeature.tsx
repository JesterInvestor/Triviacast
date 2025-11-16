"use client";

import React from "react";
import { useAuthenticate } from "@coinbase/onchainkit/minikit";
import { useState } from "react";

export default function ProtectedFeature() {
  const { signIn } = useAuthenticate();
  const [user, setUser] = useState<{ fid: string } | null>(null);

  const handleAuth = async () => {
    const auth = await signIn();
    if (auth) {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auth),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.fid) setUser({ fid: String(data.fid) });
    }
  };

  if (!user) {
    return (
      <div className="rounded-md border p-4 bg-yellow-50 text-yellow-900">
        <h3 className="font-semibold">Authentication Required</h3>
        <p className="mt-1 mb-2 text-sm">Please sign in to access this feature.</p>
        <button className="rounded bg-black text-white px-3 py-1" onClick={handleAuth}>
          Sign In with Farcaster
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border p-4">
      <h3 className="font-semibold">Welcome, {user.fid}!</h3>
      <p className="text-sm">This content is protected.</p>
    </div>
  );
}
