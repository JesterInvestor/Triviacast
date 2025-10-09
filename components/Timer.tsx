'use client';

interface TimerProps {
  timeRemaining: number;
}

export default function Timer({ timeRemaining }: TimerProps) {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  
  const getTimerColor = () => {
    if (timeRemaining > 120) return "text-green-600";
    if (timeRemaining > 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className={`text-2xl font-bold ${getTimerColor()}`}>
      ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  );
}
