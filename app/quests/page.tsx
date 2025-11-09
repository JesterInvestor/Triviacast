"use client";

export default function QuestsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] flex flex-col items-center justify-center">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
          <img src="/brain-small.svg" alt="Brain" className="w-10 h-10 sm:w-12 sm:h-12 mb-2 drop-shadow" />
          <h1 className="text-5xl sm:text-6xl font-extrabold text-[#2d1b2e] text-center">Quests</h1>
          <p className="text-base sm:text-lg text-[#5a3d5c] text-center">Quests coming soon......</p>
        </div>
      </div>
    </div>
  );
}
