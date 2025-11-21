"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { TRIV_ABI, STAKING_ABI } from "../lib/stakingClient";

const STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_ADDRESS || "";
const TRIV_ADDRESS = process.env.NEXT_PUBLIC_TRIV_ADDRESS || "";

export default function StakingWidget() {
  const { address, isConnected } = useAccount();

  const [tokenBalance, setTokenBalance] = useState("0");
  const [stakedBalance, setStakedBalance] = useState("0");
  const [earned, setEarned] = useState("0");
  const [totalStaked, setTotalStaked] = useState("0");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);

  const format6 = (val: string) => {
    try {
      const n = Number(val);
      if (!isFinite(n)) return "0.000000";
      return n.toFixed(6);
    } catch (e) {
      return "0.000000";
    }
  };

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      if (!address) return;
      try {
        const hasWindow = typeof window !== "undefined" && (window as any).ethereum;
        const provider = hasWindow ? new ethers.BrowserProvider((window as any).ethereum) : null;
        if (!provider) return;

        const triv = new ethers.Contract(TRIV_ADDRESS, TRIV_ABI, provider);
        const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, provider);

        const [tb, sb, er, ts] = await Promise.all([
          triv.balanceOf(address),
          staking.balanceOf(address),
          staking.earned(address),
          staking.totalSupply(),
        ]);

        if (!mounted) return;
        setTokenBalance(ethers.formatUnits(tb, 18));
        setStakedBalance(ethers.formatUnits(sb, 18));
        setEarned(ethers.formatUnits(er, 18));
        setTotalStaked(ethers.formatUnits(ts, 18));
      } catch (e) {
        // ignore
      }
    }

    refresh();
    const id = setInterval(refresh, 10_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [address]);

  const doApproveAndStake = async () => {
    if (!address) return;
    setLoading(true);
    setTxStatus("pending");
    setTxHash(null);
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) throw new Error("No injected wallet available");
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const signerObj = await browserProvider.getSigner();
      const triv = new ethers.Contract(TRIV_ADDRESS, TRIV_ABI, signerObj as any);
      const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signerObj as any);
      const parsed = ethers.parseUnits(amount || "0", 18);
      // Approve
      const allowance = await triv.allowance(address, STAKING_ADDRESS);
      if (allowance < parsed) {
        const tx = await triv.approve(STAKING_ADDRESS, parsed);
        await tx.wait();
      }
      const stakeTx = await staking.stake(parsed);
      setTxHash(stakeTx.hash ?? null);
      await stakeTx.wait();
      setTxStatus("success");
    } catch (e) {
      setTxStatus("error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const doWithdraw = async () => {
    if (!address) return;
    setLoading(true);
    setTxStatus("pending");
    setTxHash(null);
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) throw new Error("No injected wallet available");
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const signerObj = await browserProvider.getSigner();
      const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signerObj as any);
      const parsed = ethers.parseUnits(amount || "0", 18);
      const tx = await staking.withdraw(parsed);
      setTxHash(tx.hash ?? null);
      await tx.wait();
      setTxStatus("success");
    } catch (e) {
      setTxStatus("error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const doClaim = async () => {
    if (!address) return;
    setLoading(true);
    setTxStatus("pending");
    setTxHash(null);
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) throw new Error("No injected wallet available");
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const signerObj = await browserProvider.getSigner();
      const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signerObj as any);
      const tx = await staking.claimReward();
      setTxHash(tx.hash ?? null);
      await tx.wait();
      setTxStatus("success");
    } catch (e) {
      setTxStatus("error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const doExit = async () => {
    if (!address) return;
    setLoading(true);
    setTxStatus("pending");
    setTxHash(null);
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) throw new Error("No injected wallet available");
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const signerObj = await browserProvider.getSigner();
      const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, signerObj as any);
      const tx = await staking.exit();
      setTxHash(tx.hash ?? null);
      await tx.wait();
      setTxStatus("success");
    } catch (e) {
      setTxStatus("error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!STAKING_ADDRESS || !TRIV_ADDRESS) {
    return (
      <div className="mt-6 w-full text-left px-4">
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
          Staking is not configured. Set `NEXT_PUBLIC_TRIV_ADDRESS` and `NEXT_PUBLIC_STAKING_ADDRESS` in your environment.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 w-full text-left px-4 sm:px-0">
      <div className="p-4 sm:p-6 rounded-xl bg-white/90 border border-[#F4A6B7] shadow-sm text-gray-900 w-full max-w-full overflow-visible">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Stake TRIV for Rewards</h2>
        <div className="mb-3">
          <span className="inline-block px-3 py-1 rounded-full bg-[#FFF3F6] text-gray-800 font-semibold text-sm">Current APR: 80%</span>
        </div>
        <p className="text-sm text-gray-700 mb-4">You can stake using Base App. Works in Farcaster desktop and browser w/ wallet extension — sorry for any inconvenience. (Dec 17th)</p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-[#fff0f4] rounded break-words">Your TRIV: <strong>{format6(tokenBalance)}</strong></div>
          <div className="p-3 bg-[#fff0f4] rounded break-words">Staked: <strong>{format6(stakedBalance)}</strong></div>
          <div className="p-3 bg-[#fff0f4] rounded break-words">Earned: <strong>{format6(earned)}</strong></div>
          <div className="p-3 bg-[#fff0f4] rounded break-words">Total Staked: <strong>{format6(totalStaked)}</strong></div>
        </div>

        {!isConnected ? (
          <div className="text-sm text-gray-700">Connect your wallet to stake.</div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 w-full items-start">
              <input
                className="flex-1 min-w-0 px-3 py-2 rounded border border-gray-200"
                placeholder="Amount to stake / withdraw"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="Amount to stake or withdraw"
              />
              <button
                onClick={doExit}
                disabled={loading}
                className="hidden sm:inline-block ml-2 px-3 py-2 bg-white border rounded text-sm"
                title="Exit (unstake + claim)"
              >
                Exit
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button disabled={loading} onClick={doApproveAndStake} className="w-full sm:w-auto px-4 py-2 bg-[#FFC4D1] rounded font-semibold">Stake</button>
              <button disabled={loading} onClick={doWithdraw} className="w-full sm:w-auto px-4 py-2 bg-white border rounded">Withdraw</button>
              <button disabled={loading} onClick={doClaim} className="w-full sm:w-auto px-4 py-2 bg-white border rounded font-semibold">Claim</button>
            </div>
          </div>
        )}
        {txStatus !== "idle" && (
          <div className="mt-3 text-sm">
            <strong>Status:</strong> {txStatus}
            {txHash && (
              <div>
                <a className="text-blue-700 break-words" target="_blank" rel="noreferrer" href={`https://basescan.org/tx/${txHash}`}>
                  View tx
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
