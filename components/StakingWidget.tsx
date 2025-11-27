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

  // Diagnostics + swap result state
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [detectedGlobals, setDetectedGlobals] = useState<string[] | null>(null);
  const [swapTxs, setSwapTxs] = useState<string[] | null>(null);

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

  // Open Mint Club (keeps web fallback)
  const openMintClubSDK = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    const url = "https://mint.club/staking/base/160";

    // Try Farcaster mini-app open first
    try {
      const globalAny = window as any;
      const sdkCandidates = [globalAny.sdk, globalAny.farcaster?.sdk, globalAny.MiniAppSDK, globalAny.miniAppSdk, globalAny.farcasterMiniAppSdk];
      for (const candidate of sdkCandidates) {
        if (!candidate) continue;
        try {
          if (candidate.actions && typeof candidate.actions.openMiniApp === "function") {
            await candidate.actions.openMiniApp({ url });
            return;
          }
          if (typeof candidate.openMiniApp === "function") {
            try {
              await candidate.openMiniApp({ url });
            } catch {
              await candidate.openMiniApp(url);
            }
            return;
          }
        } catch {}
      }
    } catch (err) {
      console.error("openMintClubSDK native attempt failed:", err);
    }

    // fallback to web
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Farcaster / Base native swap using sdk.actions.swapToken per the Farcaster miniapp docs you provided
  // - sellToken: eip155:8453/native (Base native ETH)
  // - buyToken: eip155:8453/erc20:<TRIV_ADDRESS>
  // - optionally pass sellAmount if user entered an amount (converted to base units)
  const openBuyTRIV = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();

    setNativeError(null);
    setDetectedGlobals(null);
    setSwapTxs(null);

    if (!TRIV_ADDRESS) {
      setNativeError("TRIV contract address not configured (NEXT_PUBLIC_TRIV_ADDRESS).");
      return;
    }

    const tokenAddress = TRIV_ADDRESS.toLowerCase();
    const sellToken = "eip155:8453/native";
    const buyToken = `eip155:8453/erc20:${tokenAddress}`;

    // If user entered an amount, convert to wei (string). Otherwise undefined to just prefill tokens.
    let sellAmount: string | undefined = undefined;
    try {
      if (amount && amount.trim() !== "") {
        // parseUnits may throw; guard it
        sellAmount = ethers.parseUnits(amount, 18).toString();
      }
    } catch (err) {
      console.warn("Could not parse sell amount, ignoring sellAmount param:", err);
      sellAmount = undefined;
    }

    const payload: any = {
      sellToken,
      buyToken,
    } as any;
    if (sellAmount) payload.sellAmount = sellAmount;

    // Candidate globals to check (Farcaster primary, but include a few variants)
    const globalAny = window as any;
    const candidates = [
      { name: "sdk", obj: globalAny.sdk },
      { name: "farcaster.sdk", obj: globalAny.farcaster?.sdk },
      { name: "farcasterSdk", obj: globalAny.farcasterSdk },
      { name: "farcasterMiniAppSdk", obj: globalAny.farcasterMiniAppSdk },
      { name: "MiniAppSDK", obj: globalAny.MiniAppSDK },
      { name: "miniAppSdk", obj: globalAny.miniAppSdk },
      // also try some Base wallet/global names in case the Base SDK exposes a similar API
      { name: "baseSDK", obj: globalAny.baseSDK },
      { name: "BaseSDK", obj: globalAny.BaseSDK },
      { name: "BaseWallet", obj: globalAny.BaseWallet },
      { name: "baseWallet", obj: globalAny.baseWallet },
    ];

    const found: string[] = [];

    // Helper to attempt calling a function and return the result or false
    const tryCall = async (fn: Function, arg: any) => {
      try {
        const res = fn.call(undefined, arg);
        if (res && typeof (res as any).then === "function") {
          return await res;
        }
        return res;
      } catch (err) {
        return false;
      }
    };

    try {
      for (const c of candidates) {
        const candidate = c.obj;
        if (!candidate) continue;
        found.push(c.name);

        // Preferred shape per Farcaster docs: candidate.actions.swapToken({ ... })
        try {
          if (candidate.actions && typeof candidate.actions.swapToken === "function") {
            const res = await tryCall(candidate.actions.swapToken, payload);
            // Expecting SwapTokenResult-like object
            if (res && (res.success === true || res.success === false)) {
              if (res.success) {
                setSwapTxs(res.swap?.transactions ?? null);
                setNativeError(null);
              } else {
                setNativeError(`Swap failed: ${res.reason ?? "unknown"} ${res.error?.message ?? ""}`);
              }
              setDetectedGlobals(found);
              return;
            }
          }
        } catch (err) {
          // continue to other shapes
        }

        // Also try direct candidate.actions.swapToken if candidate.actions exists but different shape
        try {
          if (candidate.actions && typeof candidate.actions === "object" && typeof (candidate.actions as any)["swapToken"] === "function") {
            const res = await tryCall((candidate.actions as any)["swapToken"], payload);
            if (res && (res.success === true || res.success === false)) {
              if (res.success) {
                setSwapTxs(res.swap?.transactions ?? null);
                setNativeError(null);
              } else {
                setNativeError(`Swap failed: ${res.reason ?? "unknown"} ${res.error?.message ?? ""}`);
              }
              setDetectedGlobals(found);
              return;
            }
          }
        } catch {}

        // Try candidate.swapToken directly
        try {
          if (typeof candidate.swapToken === "function") {
            const res = await tryCall(candidate.swapToken, payload);
            if (res && (res.success === true || res.success === false)) {
              if (res.success) {
                setSwapTxs(res.swap?.transactions ?? null);
                setNativeError(null);
              } else {
                setNativeError(`Swap failed: ${res.reason ?? "unknown"} ${res.error?.message ?? ""}`);
              }
              setDetectedGlobals(found);
              return;
            }
          }
        } catch {}

        // Some implementations accept (sellToken, buyToken, sellAmount)
        try {
          if (typeof candidate.swap === "function") {
            const args = sellAmount ? [sellToken, buyToken, sellAmount] : [sellToken, buyToken];
            const res = await tryCall(candidate.swap, args);
            // if res is an object with transactions or boolean, try to interpret it
            if (res && typeof res === "object" && (res.transactions || res.success !== undefined)) {
              // try reading transactions
              if ((res as any).transactions) {
                setSwapTxs((res as any).transactions);
                setNativeError(null);
              } else if ((res as any).success === true && (res as any).swap?.transactions) {
                setSwapTxs((res as any).swap.transactions);
                setNativeError(null);
              } else {
                setNativeError("Swap invoked but no transactions returned.");
              }
              setDetectedGlobals(found);
              return;
            }
            // if res === true assume invoked
            if (res === true) {
              setDetectedGlobals(found);
              setNativeError("Swap invoked (no transactions returned by SDK).");
              return;
            }
          }
        } catch {}
      }

      // nothing found / invoked
      setDetectedGlobals(found.length ? found : []);
      setNativeError(
        "No Farcaster or Base mini-app SDK with swapToken support detected. Please open this page in a Farcaster client (with mini-app support) or the Base wallet."
      );
    } catch (err: any) {
      console.error("openBuyTRIV error:", err);
      setNativeError(`Error invoking native swap: ${err?.message ?? String(err)}`);
      setDetectedGlobals(found.length ? found : []);
    }
  };

  if (!STAKING_ADDRESS || !TRIV_ADDRESS) {
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
      <div className="p-6 rounded-xl bg-white/90 border border-[#F4A6B7] shadow-sm text-gray-900 overflow-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Stake TRIV for Rewards</h2>
        <div className="mb-3">
          <span className="inline-block px-3 py-1 rounded-full bg-[#FFF3F6] text-gray-800 font-semibold text-sm">Current APY: 80%</span>
        </div>
        <p className="text-sm text-gray-700 mb-4">
          You can stake using Base App and Rainbow Wallet. Also works in Farcaster desktop and browser w/ wallet extension — sorry for any inconvenience.
        </p>

        <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#fff0f4] rounded min-w-0 break-words text-sm sm:text-base">Your TRIV: <strong>{format6(tokenBalance)}</strong></div>
          <div className="p-3 bg-[#fff0f4] rounded min-w-0 break-words text-sm sm:text-base">Staked: <strong>{format6(stakedBalance)}</strong></div>
          <div className="p-3 bg-[#fff0f4] rounded min-w-0 break-words text-sm sm:text-base">Earned: <strong>{format6(earned)}</strong></div>
          <div className="p-3 bg-[#fff0f4] rounded min-w-0 break-words text-sm sm:text-base">Total Staked: <strong>{format6(totalStaked)}</strong></div>
        </div>

        {!isConnected ? (
          <div className="text-sm text-gray-700">Connect your wallet to stake.</div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <input
                className="flex-1 min-w-0 px-3 py-2 rounded border border-gray-200 text-sm"
                placeholder="Amount to stake / withdraw"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                aria-label="Amount to stake or withdraw"
              />
              <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                <button
                  disabled={loading}
                  onClick={doApproveAndStake}
                  className="w-full sm:w-auto px-4 py-2 bg-[#FFC4D1] rounded font-semibold text-sm min-w-0 whitespace-normal break-words"
                >
                  Stake
                </button>
                <button
                  disabled={loading}
                  onClick={doWithdraw}
                  className="w-full sm:w-auto px-4 py-2 bg-white border rounded text-sm min-w-0 whitespace-normal break-words"
                >
                  Withdraw
                </button>
                <button
                  disabled={loading}
                  onClick={doClaim}
                  className="w-full sm:w-auto px-4 py-2 bg-white border rounded font-semibold text-sm min-w-0 whitespace-normal break-words"
                >
                  Claim
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {txStatus !== "idle" && (
                <div className="text-sm break-words text-right">
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
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <div className="inline-flex gap-3 items-center">
          <a
            href="https://link.metamask.io/dapp/https://triviacast.xyz/jackpot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#2d1b2e] hover:underline"
          >
            Open in MetaMask
          </a>
          <a
            href={`https://rnbwapp.com/wc?uri=${encodeURIComponent("https://triviacast.xyz/jackpot")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#2d1b2e] hover:underline"
          >
            Open in Rainbow
          </a>

          <button
            onClick={openMintClubSDK}
            className="px-4 py-2 bg-[#FFC4D1] rounded font-semibold text-sm text-[#2d1b2e] hover:brightness-95"
            aria-label="Open in Mint Club"
            title="Open in Mint Club"
            type="button"
          >
            Open in Mint Club
          </button>

          <button
            onClick={openBuyTRIV}
            className="px-4 py-2 bg-white border rounded font-semibold text-sm text-[#2d1b2e] hover:brightness-95"
            aria-label="Buy TRIV"
            title="Buy TRIV"
            type="button"
          >
            Buy TRIV
          </button>
        </div>
      </div>

      {/* Native SDK diagnostics & messages */}
      {nativeError && (
        <div className="mt-3 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          {nativeError}
          {detectedGlobals && detectedGlobals.length > 0 && (
            <div className="mt-2 text-xs text-gray-700">
              Detected globals: {detectedGlobals.join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Swap transactions (if any) */}
      {swapTxs && swapTxs.length > 0 && (
        <div className="mt-3 p-3 rounded bg-green-50 border border-green-200 text-green-800 text-sm">
          Swap invoked successfully. Transactions:
          <ul className="mt-2 list-disc list-inside text-xs text-gray-700">
            {swapTxs.map((t) => (
              <li key={t}>
                <a href={`https://basescan.org/tx/${t}`} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                  {t}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}