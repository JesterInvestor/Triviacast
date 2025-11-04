"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import dynamic from 'next/dynamic';

// Dynamically import the modal to avoid SSR issues
const SignInModal = dynamic(() => import('./SignInModal'), { ssr: false });

export default function SignInButton() {
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted (client-side only)
  if (!mounted) {
    return (
      <button
        disabled
        className="bg-[#DC8291] text-white font-bold py-3 px-6 rounded-lg shadow-md flex items-center gap-2 justify-center min-h-[44px]"
        style={{
          fontSize: '1rem',
          opacity: 0.6,
        }}
      >
        🔑 Loading...
      </button>
    );
  }

  // Don't show button if already connected
  if (isConnected) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-[#DC8291] hover:bg-[#C86D7D] active:bg-[#C86D7D] text-white font-bold py-3 px-6 rounded-lg transition shadow-md flex items-center gap-2 justify-center min-h-[44px]"
        style={{
          fontSize: '1rem',
        }}
      >
        🔑 Sign In to Play
      </button>
      {showModal && <SignInModal isOpen={showModal} onClose={() => setShowModal(false)} />}
    </>
  );
}
