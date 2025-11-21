import React, { useEffect, useState } from "react";
import StakingWidget from "components/StakingWidget"; // Existing widget
import { useAccount } from "wagmi"; // Wallet connectivity
import { getIQPoints } from "@/lib/iq"; // IQ points function
import { getTriviaPoints } from "@/lib/trivia"; // Trivia points function
import {
  Jackpot as MegapotJackpot,
  MegapotProvider,
} from "@coordinationlabs/megapot-ui-kit"; // MegaPot UI components
import { base } from "viem/chains";

export default function JackpotPage() {
  const { address } = useAccount(); // Wallet address
  const [eligible, setEligible] = useState(false); // Eligibility flag
  const [loading, setLoading] = useState(true); // Loading state
  const [error, setError] = useState(""); // Error message

  useEffect(() => {
    async function validateEligibility() {
      if (!address) {
        setEligible(false);
        return;
      }

      setLoading(true);
      try {
        const tPointsResponse = await getTriviaPoints(address); // Fetch T Points
        const iqPointsResponse = await getIQPoints(address); // Fetch IQ
        const tPoints = parseInt(tPointsResponse.toString(), 10);
        const iqPoints = parseInt(iqPointsResponse.toString(), 10);

        // Set eligibility if both thresholds are met
        setEligible(tPoints >= 100000 && iqPoints >= 60);
        setError(""); // Clear prior errors
      } catch (e) {
        console.error("Failed to fetch points:", e);
        setError("Unable to validate eligibility. Please try again later.");
        setEligible(false); // Default to ineligible
      } finally {
        setLoading(false);
      }
    }

    validateEligibility();
  }, [address]);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFE4EC] to-[#FFC4D1] p-8">
      <div
        className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center bg-white/80 backdrop-blur px-8 py-12 rounded-2xl border border-[#F4A6B7] shadow-lg"
        role="region"
        aria-label="Jackpot Section"
      >
        <h1 className="text-4xl sm:text-5xl font-extrabold text-[#2d1b2e] mb-4">
          Jackpot
        </h1>
        <p className="text-lg sm:text-xl text-[#5a3d5c] mb-6">
          {eligible
            ? "You're eligible to participate in the Jackpot!"
            : "You need at least 100,000 T Points and 60 IQ to claim the Jackpot."}
        </p>

        {/* MegaPot widget */}
        <div
          className={`relative w-full mt-6 ${
            eligible ? "" : "blur-sm pointer-events-none"
          }`} // Conditional blur for ineligible users
        >
          <MegapotProvider>
            <MegapotJackpot contract={/* Existing MegaPot contract info here */} />
          </MegapotProvider>

          {/* Overlay message for ineligible users */}
          {!eligible && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-[#5a3d5c] text-lg font-semibold rounded-lg">
              Earn more T Points and IQ to unlock this feature!
            </div>
          )}
        </div>

        {/* Staking widget or other content */}
        <StakingWidget />
      </div>
    </main>
  );
}