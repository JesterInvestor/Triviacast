"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import SpinWheel from '@/components/SpinWheel';
import JackpotInfoModal from '@/components/JackpotInfoModal';
import WagmiWalletConnect from '@/components/WagmiWalletConnect';

interface Prize {
  name: string;
  amount: string;
  color: string;
  probability: number;
}

const prizes: Prize[] = [
  { name: 'Jackpot', amount: '10M $TRIV', color: '#FF6B9D', probability: 0.001 },
  { name: 'Mega', amount: '1M $TRIV', color: '#FFB6C1', probability: 0.01 },
  { name: 'Big', amount: '100K $TRIV', color: '#FFC4D1', probability: 0.05 },
  { name: 'Medium', amount: '10K $TRIV', color: '#FFD1DC', probability: 0.10 },
  { name: 'Small', amount: '1K $TRIV', color: '#FFE4EC', probability: 0.20 },
  { name: 'Tiny', amount: '100 $TRIV', color: '#FFF0F5', probability: 0.639 },
];

export default function JackpotPage() {
  const { address, isConnected } = useAccount();
  const [isSpinning, setIsSpinning] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [lastPrize, setLastPrize] = useState<Prize | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [totalSpins, setTotalSpins] = useState(0);
  const [totalWinnings, setTotalWinnings] = useState(0);

  useEffect(() => {
    // Load user stats from localStorage
    if (address) {
      const stats = localStorage.getItem(`jackpot_stats_${address}`);
      if (stats) {
        const parsed = JSON.parse(stats);
        setTotalSpins(parsed.totalSpins || 0);
        setTotalWinnings(parsed.totalWinnings || 0);
      }
    }
  }, [address]);

  const handleSpin = async (): Promise<number> => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first!');
      throw new Error('Wallet not connected');
    }

    setIsSpinning(true);
    setShowResult(false);
    setLastPrize(null);

    try {
      // Simulate API call to backend/smart contract
      // In production, this would call the smart contract
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate random prize based on probabilities
      const random = Math.random();
      let cumulativeProbability = 0;
      let prizeIndex = prizes.length - 1;

      for (let i = 0; i < prizes.length; i++) {
        cumulativeProbability += prizes[i].probability;
        if (random < cumulativeProbability) {
          prizeIndex = i;
          break;
        }
      }

      const wonPrize = prizes[prizeIndex];
      
      // Wait for spin animation to complete
      setTimeout(() => {
        setLastPrize(wonPrize);
        setShowResult(true);
        setIsSpinning(false);

        // Update stats
        const newTotalSpins = totalSpins + 1;
        const prizeAmount = parseInt(wonPrize.amount.replace(/[^0-9]/g, ''));
        const newTotalWinnings = totalWinnings + prizeAmount;
        
        setTotalSpins(newTotalSpins);
        setTotalWinnings(newTotalWinnings);

        // Save to localStorage
        if (address) {
          localStorage.setItem(`jackpot_stats_${address}`, JSON.stringify({
            totalSpins: newTotalSpins,
            totalWinnings: newTotalWinnings,
          }));
        }
      }, 5000);

      return prizeIndex;
    } catch (error) {
      console.error('Spin error:', error);
      setIsSpinning(false);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center pb-20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-end gap-2 mb-4">
          <WagmiWalletConnect />
        </div>

        <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
          {/* Title */}
          <div className="flex items-center gap-3 mb-2">
            <img src="/brain-small.svg" alt="Brain" className="w-12 h-12 drop-shadow" />
            <h1 className="text-5xl sm:text-6xl font-extrabold text-[#2d1b2e] text-center">
              $TRIV Jackpot
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-[#5a3d5c] text-center mb-4">
            Spin the wheel for a chance to win up to 10,000,000 $TRIV!
          </p>

          {/* Info Button */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="bg-[#F4A6B7] hover:bg-[#E8949C] text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-md mb-4"
          >
            ℹ️ How It Works
          </button>

          {/* Wallet Connection Check */}
          {!isConnected && (
            <div className="bg-white bg-opacity-80 rounded-xl p-6 shadow-lg text-center mb-6">
              <p className="text-[#5a3d5c] mb-4">
                Connect your wallet to start spinning!
              </p>
              <WagmiWalletConnect />
            </div>
          )}

          {/* Spin Wheel */}
          {isConnected && (
            <div className="bg-white bg-opacity-50 rounded-2xl p-6 sm:p-8 shadow-2xl">
              <SpinWheel
                onSpin={handleSpin}
                prizes={prizes}
                isSpinning={isSpinning}
              />
            </div>
          )}

          {/* Result Display */}
          {showResult && lastPrize && (
            <div className="bg-white bg-opacity-90 rounded-xl p-6 shadow-xl text-center animate-bounce mb-4">
              <h2 className="text-2xl font-bold text-[#2d1b2e] mb-2">
                🎉 Congratulations! 🎉
              </h2>
              <p className="text-xl text-[#5a3d5c] mb-1">
                You won:
              </p>
              <p className="text-3xl font-extrabold" style={{ color: lastPrize.color }}>
                {lastPrize.amount}
              </p>
            </div>
          )}

          {/* Stats */}
          {isConnected && (
            <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-6">
              <div className="bg-white bg-opacity-70 rounded-xl p-4 text-center">
                <p className="text-sm text-[#5a3d5c] mb-1">Total Spins</p>
                <p className="text-2xl font-bold text-[#2d1b2e]">{totalSpins}</p>
              </div>
              <div className="bg-white bg-opacity-70 rounded-xl p-4 text-center">
                <p className="text-sm text-[#5a3d5c] mb-1">Total Winnings</p>
                <p className="text-2xl font-bold text-[#DC8291]">
                  {totalWinnings.toLocaleString()} $TRIV
                </p>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="bg-white bg-opacity-60 rounded-xl p-4 mt-6 max-w-2xl">
            <p className="text-xs text-[#5a3d5c] text-center">
              ⚠️ <strong>Demo Mode:</strong> This is a demonstration of the jackpot feature. 
              In production, this will be integrated with the $TRIV smart contract and use 
              Chainlink VRF for verifiable on-chain randomness. All spins and winnings will 
              be recorded on the blockchain.
            </p>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      <JackpotInfoModal
        isOpen={showInfoModal}
        onClose={() => setShowInfoModal(false)}
      />
    </div>
  );
}
