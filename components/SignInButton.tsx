"use client";

import { useState } from 'react';
import { useAccount } from 'wagmi';
import SignInModal from './SignInModal';

export default function SignInButton() {
  const [showModal, setShowModal] = useState(false);
  const { isConnected } = useAccount();

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
      <SignInModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
