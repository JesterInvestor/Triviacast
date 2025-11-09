"use client";

import { useState, useRef, useEffect } from 'react';

interface Prize {
  name: string;
  amount: string;
  color: string;
  probability: number;
}

interface SpinWheelProps {
  onSpin: () => Promise<number>; // Returns prize index
  prizes: Prize[];
  isSpinning: boolean;
}

export default function SpinWheel({ onSpin, prizes, isSpinning }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelSize = 400;
  const centerX = wheelSize / 2;
  const centerY = wheelSize / 2;
  const radius = wheelSize / 2 - 20;

  useEffect(() => {
    drawWheel();
  }, [prizes]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, wheelSize, wheelSize);

    const totalSlices = prizes.length;
    const sliceAngle = (2 * Math.PI) / totalSlices;

    // Draw slices
    prizes.forEach((prize, index) => {
      const startAngle = index * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = prize.color;
      ctx.fill();
      ctx.strokeStyle = '#2d1b2e';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(prize.name, radius * 0.7, 0);
      ctx.font = '12px Arial';
      ctx.fillText(prize.amount, radius * 0.7, 18);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#F4A6B7';
    ctx.fill();
    ctx.strokeStyle = '#2d1b2e';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw "SPIN" text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', centerX, centerY);
  };

  const handleSpin = async () => {
    if (isAnimating || isSpinning) return;

    setIsAnimating(true);
    try {
      const prizeIndex = await onSpin();
      
      // Calculate target rotation
      const sliceAngle = 360 / prizes.length;
      const targetSlice = prizes.length - prizeIndex - 1; // Reverse because wheel rotates clockwise
      const targetAngle = targetSlice * sliceAngle + sliceAngle / 2;
      
      // Add multiple full rotations for effect (5-8 full spins)
      const fullRotations = 5 + Math.floor(Math.random() * 3);
      const finalRotation = fullRotations * 360 + targetAngle;

      // Animate rotation
      const startRotation = rotation % 360;
      const totalRotation = finalRotation + (360 - startRotation);
      
      setRotation(rotation + totalRotation);
      
      // Wait for animation to complete
      setTimeout(() => {
        setIsAnimating(false);
      }, 5000);
    } catch (error) {
      console.error('Spin failed:', error);
      setIsAnimating(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Pointer arrow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
        <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-[#DC8291] drop-shadow-lg" />
      </div>

      {/* Wheel container */}
      <div className="relative mt-8">
        <canvas
          ref={canvasRef}
          width={wheelSize}
          height={wheelSize}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isAnimating ? 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
          }}
          className="drop-shadow-2xl"
        />

        {/* Spin button overlay */}
        <button
          onClick={handleSpin}
          disabled={isAnimating || isSpinning}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] rounded-full bg-[#F4A6B7] hover:bg-[#E8949C] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors border-4 border-[#2d1b2e] cursor-pointer active:scale-95"
          aria-label="Spin the wheel"
        >
          <span className="text-white font-bold text-xs">
            {isAnimating || isSpinning ? '...' : 'SPIN'}
          </span>
        </button>
      </div>

      {/* Status text */}
      {(isAnimating || isSpinning) && (
        <div className="mt-4 text-center">
          <p className="text-lg font-bold text-[#2d1b2e] animate-pulse">
            Spinning...
          </p>
        </div>
      )}
    </div>
  );
}
