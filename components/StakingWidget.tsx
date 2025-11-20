"use client";

import React, { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { callStake, withdrawStake, claimStakeReward, exitStake } from "../lib/staking";
import { ethers } from "ethers";
import { TRIV_ABI, STAKING_ABI } from "../lib/stakingClient";

const BUILD_STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_ADDRESS || "";
const BUILD_TRIV_ADDRESS = process.env.NEXT_PUBLIC_TRIV_ADDRESS || "";

export default function StakingWidget() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [tokenBalance, setTokenBalance] = useState("0");
  const [stakedBalance, setStakedBalance] = useState("0");
  const [earned, setEarned] = useState("0");
  const [totalStaked, setTotalStaked] = useState("0");
  const [runtimeConfig, setRuntimeConfig] = useState<{ NEXT_PUBLIC_STAKING_ADDRESS?: string | null; NEXT_PUBLIC_TRIV_ADDRESS?: string | null } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
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

  // Fetch runtime config only if build-time values are missing.
  useEffect(() => {
    let mounted = true;
    async function loadConfig() {
      if (BUILD_STAKING_ADDRESS && BUILD_TRIV_ADDRESS) return;
      setLoadingConfig(true);
      try {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('failed to fetch config');
        const payload = await res.json();
        if (!mounted) return;
        setRuntimeConfig(payload);
      } catch (err) {
        console.error('StakingWidget: could not load runtime config', err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let id: any = null;

    const resolvedStaking = (BUILD_STAKING_ADDRESS || runtimeConfig?.NEXT_PUBLIC_STAKING_ADDRESS) as string | undefined;
    const resolvedTriv = (BUILD_TRIV_ADDRESS || runtimeConfig?.NEXT_PUBLIC_TRIV_ADDRESS) as string | undefined;

    async function refresh() {
      if (!address) return;
      if (!resolvedStaking || !resolvedTriv) return;
      try {
        const pc = publicClient;
        if (!pc) throw new Error('publicClient unavailable');

        const [tb, sb, er, ts] = await Promise.all([
          pc.readContract({ address: resolvedTriv as `0x${string}`, abi: TRIV_ABI as any, functionName: 'balanceOf', args: [address as `0x${string}`] }),
          pc.readContract({ address: resolvedStaking as `0x${string}`, abi: STAKING_ABI as any, functionName: 'balanceOf', args: [address as `0x${string}`] }),
          pc.readContract({ address: resolvedStaking as `0x${string}`, abi: STAKING_ABI as any, functionName: 'earned', args: [address as `0x${string}`] }),
          pc.readContract({ address: resolvedStaking as `0x${string}`, abi: STAKING_ABI as any, functionName: 'totalSupply', args: [] }),
        ]);

        if (!mounted) return;
        setTokenBalance(ethers.formatUnits(tb as any, 18));
        setStakedBalance(ethers.formatUnits(sb as any, 18));
        setEarned(ethers.formatUnits(er as any, 18));
        setTotalStaked(ethers.formatUnits(ts as any, 18));
      } catch (err) {
        console.warn('publicClient.readContract failed, falling back to server endpoint', err);
        try {
          const fallback = await fetch(`/api/chain/staking-stats?address=${address}`);
          if (fallback.ok) {
            const data = await fallback.json();
            if (!mounted) return;
            if (data.tokenBalance) setTokenBalance(String(data.tokenBalance));
            if (data.stakedBalance) setStakedBalance(String(data.stakedBalance));
            if (data.earned) setEarned(String(data.earned));
            if (data.totalStaked) setTotalStaked(String(data.totalStaked));
          }
        } catch (e) {
          console.error('StakingWidget: server fallback failed', e);
        }
      }
    }

    if (resolvedStaking && resolvedTriv) {
      refresh();
      id = setInterval(refresh, 10_000);
    }

    return () => {
      mounted = false;
      if (id) clearInterval(id);
    };
  }, [address, publicClient, runtimeConfig]);

  const doApproveAndStake = async () => {
    if (!address) return;
    setLoading(true);
    setTxStatus("pending");
    setTxHash(null);
    try {
      const parsed = ethers.parseUnits(amount || "0", 18);
      // Use helper which handles approval flow and staking via wagmi core
      const hash = await callStake(parsed);
      setTxHash(hash ?? null);
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
      const parsed = ethers.parseUnits(amount || "0", 18);
      const hash = await withdrawStake(parsed);
      setTxHash(hash ?? null);
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
      const hash = await claimStakeReward();
      setTxHash(hash ?? null);
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
      const hash = await exitStake();
      setTxHash(hash ?? null);
      setTxStatus("success");
    } catch (e) {
      setTxStatus("error");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const resolvedStakingAddr = BUILD_STAKING_ADDRESS || runtimeConfig?.NEXT_PUBLIC_STAKING_ADDRESS;
  const resolvedTrivAddr = BUILD_TRIV_ADDRESS || runtimeConfig?.NEXT_PUBLIC_TRIV_ADDRESS;

  if (loadingConfig && !BUILD_STAKING_ADDRESS && !BUILD_TRIV_ADDRESS) {
    return (
      <div className="mt-6 w-full max-w-2xl text-left">
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-gray-700">Resolving staking configuration…</div>
      </div>
    );
  }

  if (!resolvedStakingAddr || !resolvedTrivAddr) {
    return (
      <div className="mt-6 w-full max-w-2xl text-left">
        <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800">
          Staking is not configured. Set `NEXT_PUBLIC_TRIV_ADDRESS` and `NEXT_PUBLIC_STAKING_ADDRESS` in your environment.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 w-full max-w-2xl text-left">
      <div className="p-6 rounded-xl bg-white/90 border border-[#F4A6B7] shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Stake TRIV for Jackpot rewards</h2>
        <div className="mb-4">
          <span className="inline-block px-3 py-1 rounded-full bg-[#FFF3F6] text-pink-700 font-semibold text-sm">Current APR: 80%</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-[#fff0f4] rounded text-gray-900">Your TRIV: <strong>{format6(tokenBalance)}</strong></div>
          <div className="p-3 bg-[#fff0f4] rounded text-gray-900">Staked: <strong>{format6(stakedBalance)}</strong></div>
          <div className="p-3 bg-[#fff0f4] rounded text-gray-900">Earned: <strong>{format6(earned)}</strong></div>
          <div className="p-3 bg-[#fff0f4] rounded text-gray-900">Total Staked: <strong>{format6(totalStaked)}</strong></div>
        </div>

        {!isConnected ? (
          <div className="text-sm text-gray-700">Connect your wallet to stake.</div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 px-3 py-2 rounded border border-gray-200"
              placeholder="Amount to stake / withdraw"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button disabled={loading} onClick={doApproveAndStake} className="w-full sm:w-auto px-4 py-2 bg-[#FFC4D1] rounded font-semibold">Stake</button>
                <button disabled={loading} onClick={doWithdraw} className="w-full sm:w-auto px-4 py-2 bg-white border rounded">Withdraw</button>
                <button disabled={loading} onClick={doClaim} className="w-full sm:w-auto px-4 py-3 bg-white border rounded font-semibold">Claim</button>
              </div>
          </div>
        )}
        {txStatus !== "idle" && (
          <div className="mt-3 text-sm">
            <strong>Status:</strong> {txStatus}
            {txHash && (
              <div>
                <a className="text-blue-600" target="_blank" rel="noreferrer" href={`https://basescan.org/tx/${txHash}`}>
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
