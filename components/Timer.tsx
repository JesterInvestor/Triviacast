'use client';

interface TimerProps {
  timeRemaining: number;
}

export default function Timer({ timeRemaining }: TimerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const getTimerColor = () => {
    // For a 60s quiz, show green when >40s, yellow when >20s, red otherwise
    if (timeRemaining > 40) return "text-green-600";
    if (timeRemaining > 20) return "text-[#DC8291]";
    return "text-red-600";
  };

  return (
    <div className={`text-lg sm:text-2xl font-bold ${getTimerColor()} bg-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow-md border-2 border-[#F4A6B7]`}>
      ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}
