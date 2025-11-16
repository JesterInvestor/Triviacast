"use client";

import React from "react";
import { useAuthenticate } from "@coinbase/onchainkit/minikit";
import { useState } from "react";

async function saveUserSession(user: {
  fid?: string;
  signature?: string;
  message?: string;
  jwt?: string;
}) {
  try {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
      credentials: "include",
    });
  } catch (e) {
    // no-op
  }
}

export default function AuthButton() {
  const { signIn } = useAuthenticate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [user, setUser] = useState<{ fid: string } | null>(null);

  const handleAuth = async () => {
    setIsAuthenticating(true);
    try {
      const auth = await signIn();
      if (auth) {
        // Send whatever the hook returns; backend handles jwt or message+signature.
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(auth),
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.fid) {
          setUser({ fid: String(data.fid) });
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Authentication failed:", error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (user) {
    return (
      <div className="rounded-md border p-3 bg-white/5">
        <p>Authenticated as FID: {user.fid}</p>
        <button
          className="mt-2 rounded bg-gray-200 px-3 py-1 text-black"
          onClick={() => typeof window !== "undefined" && window.location.reload()}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      className="rounded bg-black text-white px-4 py-2 disabled:opacity-60"
      onClick={handleAuth}
      disabled={isAuthenticating}
    >
      {isAuthenticating ? "Authenticating..." : "Sign In with Farcaster"}
    </button>
  );
}
