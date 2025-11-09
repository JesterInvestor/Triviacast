"use client";

import { useState } from 'react';

interface JackpotInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JackpotInfoModal({ isOpen, onClose }: JackpotInfoModalProps) {
  if (!isOpen) return null;

  const prizes = [
    { name: 'Jackpot', amount: '10,000,000 $TRIV', odds: '0.1%', color: '#FF6B9D' },
    { name: 'Mega', amount: '1,000,000 $TRIV', odds: '1%', color: '#FFB6C1' },
    { name: 'Big', amount: '100,000 $TRIV', odds: '5%', color: '#FFC4D1' },
    { name: 'Medium', amount: '10,000 $TRIV', odds: '10%', color: '#FFD1DC' },
    { name: 'Small', amount: '1,000 $TRIV', odds: '20%', color: '#FFE4EC' },
    { name: 'Tiny', amount: '100 $TRIV', odds: '63.9%', color: '#FFF0F5' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fadeIn">
      <div className="bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src="/brain-small.svg" alt="Brain" className="w-10 h-10 drop-shadow" />
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#2d1b2e]">
              Jackpot Info
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#5a3d5c] hover:text-[#2d1b2e] text-2xl font-bold transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Overview */}
          <div className="bg-white bg-opacity-70 rounded-xl p-4 sm:p-6">
            <h3 className="text-xl font-bold text-[#2d1b2e] mb-3">How It Works</h3>
            <div className="space-y-2 text-[#5a3d5c]">
              <p>🎰 <strong>Spin to Win:</strong> Each spin costs 500 $TRIV tokens</p>
              <p>🎲 <strong>On-Chain Randomness:</strong> Results are verifiably random using blockchain technology</p>
              <p>💰 <strong>Instant Payouts:</strong> Win prizes ranging from 100 to 10,000,000 $TRIV!</p>
              <p>🔒 <strong>Provably Fair:</strong> All spins are recorded on-chain for transparency</p>
            </div>
          </div>

          {/* Prize Table */}
          <div className="bg-white bg-opacity-70 rounded-xl p-4 sm:p-6">
            <h3 className="text-xl font-bold text-[#2d1b2e] mb-4">Prize Tiers & Odds</h3>
            <div className="space-y-3">
              {prizes.map((prize, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg transition-all hover:scale-105"
                  style={{ backgroundColor: prize.color }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#2d1b2e]" />
                    <div>
                      <p className="font-bold text-[#2d1b2e]">{prize.name}</p>
                      <p className="text-sm text-[#5a3d5c]">{prize.amount}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#2d1b2e]">{prize.odds}</p>
                    <p className="text-xs text-[#5a3d5c]">chance</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rules & Tips */}
          <div className="bg-white bg-opacity-70 rounded-xl p-4 sm:p-6">
            <h3 className="text-xl font-bold text-[#2d1b2e] mb-3">Rules & Tips</h3>
            <ul className="space-y-2 text-[#5a3d5c] list-disc list-inside">
              <li>Connect your wallet to start spinning</li>
              <li>Ensure you have enough $TRIV tokens for spins</li>
              <li>Each spin is independent - previous results don't affect future spins</li>
              <li>Winnings are automatically credited to your wallet</li>
              <li>Check your spin history to track your wins</li>
            </ul>
          </div>

          {/* Technical Details */}
          <div className="bg-white bg-opacity-70 rounded-xl p-4 sm:p-6">
            <h3 className="text-xl font-bold text-[#2d1b2e] mb-3">Technical Details</h3>
            <div className="space-y-2 text-sm text-[#5a3d5c]">
              <p><strong>Randomness:</strong> Uses on-chain pseudo-random generation with block data</p>
              <p><strong>Network:</strong> Base Sepolia (testnet) / Base (mainnet)</p>
              <p><strong>Token:</strong> $TRIV (0x73385Ee7392C105d5898048F96a1bDF551B2D936)</p>
              <p><strong>Contract:</strong> TriviaJackpot (to be deployed)</p>
              <p className="pt-2 italic">
                Note: For production, Chainlink VRF will be implemented for true verifiable randomness
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-[#DC8291] hover:bg-[#C86D7D] text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-md"
          >
            Got It!
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
