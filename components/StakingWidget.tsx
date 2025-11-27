"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { TRIV_ABI, STAKING_ABI } from "../lib/stakingClient";

const STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_ADDRESS || "";
const TRIV_ADDRESS = process.env.NEXT_PUBLIC_TRIV_ADDRESS || "";

/**
 * Notes:
 * - This version aggressively waits/polls briefly for the Farcaster miniapp SDK to be injected,
 *   then calls sdk.actions.swapToken(...) per the API you pasted.
 * - It also attempts to call swapToken on a few other likely globals and even on window.parent/window.top
 *   (wrapped in try/catch to avoid cross-origin errors).
 * - sellToken uses CAIP-19 "eip155:8453/native" and buyToken uses "eip155:8453/erc20:<TRIV_ADDRESS>".
 * - sellAmount (if provided) is passed as a base-unit string (wei) using ethers.parseUnits(amount, 18).
 */

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

  // Wait/poll for 'sdk' (or variations) for up to timeoutMs.
  // Returns the found object and a name string representing where it was found.
  const waitForSdk = async (timeoutMs = 3000, intervalMs = 200) => {
    const start = Date.now();
    const candidateGetters: Array<() => { name: string; obj: any } | null> = [
      () => ({ name: "window.sdk", obj: (window as any).sdk }),
      () => ({ name: "window.farcaster?.sdk", obj: (window as any).farcaster?.sdk }),
      () => ({ name: "window.farcasterSdk", obj: (window as any).farcasterSdk }),
      () => ({ name: "window.farcasterMiniAppSdk", obj: (window as any).farcasterMiniAppSdk }),
      () => ({ name: "window.MiniAppSDK", obj: (window as any).MiniAppSDK }),
      () => ({ name: "window.miniAppSdk", obj: (window as any).miniAppSdk }),
      () => ({ name: "window.parent.sdk", obj: (() => { try { return (window.parent as any)?.sdk; } catch { return undefined; } })() }),
      () => ({ name: "window.top.sdk", obj: (() => { try { return (window.top as any)?.sdk; } catch { return undefined; } })() }),
    ];

    while (Date.now() - start < timeoutMs) {
      for (const getter of candidateGetters) {
        try {
          const got = getter();
          if (got && got.obj) {
            return got;
          }
        } catch {
          // ignore
        }
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    // last-ditch: return first non-null that exists (without waiting)
    for (const getter of candidateGetters) {
      try {
        const got = getter();
        if (got && got.obj) return got;
      } catch {}
    }
    return null;
  };

  // Farcaster / Base native swap using sdk.actions.swapToken per the Farcaster miniapp docs you provided
  // - sellToken: eip155:8453/native (Base native)
  // - buyToken: eip155:8453/erc20:<TRIV_ADDRESS>
  // - sellAmount (optional): string in base units (wei)
  const openBuyTRIV = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();

    setNativeError(null);
    setDetectedGlobals(null);
    setSwapTxs(null);

    if (!TRIV_ADDRESS) {
      setNativeError("TRIV contract address not configured (NEXT_PUBLIC_TRIV_ADDRESS).");
      return;
    }

    // Ensure lowercase address in CAIP string
    const tokenAddress = TRIV_ADDRESS.toLowerCase();
    const sellToken = "eip155:8453/native";
    const buyToken = `eip155:8453/erc20:${tokenAddress}`;

    // Convert amount to wei string if provided and valid
    let sellAmount: string | undefined = undefined;
    if (amount && amount.trim() !== "") {
      try {
        sellAmount = ethers.parseUnits(amount.trim(), 18).toString();
      } catch (err) {
        console.warn("Could not parse sell amount, ignoring:", err);
        // keep sellAmount undefined (pre-fill tokens only)
      }
    }

    const payload: any = { sellToken, buyToken } as any;
    if (sellAmount) payload.sellAmount = sellAmount;

    // Wait briefly for SDK to be injected (Farcaster miniapp often injects sdk after page load)
    const found = await waitForSdk(3000, 200);
    if (!found) {
      // Nothing found after polling; record helpful diagnostic
      setDetectedGlobals([]);
      setNativeError(
        "No Farcaster miniapp SDK detected (window.sdk). Please open this page inside the Farcaster mobile app (in-app browser) or the Base wallet that exposes a native SDK."
      );
      return;
    }

    setDetectedGlobals([found.name]);

    const sdkObj = found.obj;

    // Try the documented call: sdk.actions.swapToken({ sellToken, buyToken, sellAmount })
    try {
      if (sdkObj.actions && typeof sdkObj.actions.swapToken === "function") {
        const result = await sdkObj.actions.swapToken(payload);
        // result is SwapTokenResult union
        if (result && (result.success === true || result.success === false)) {
          if (result.success) {
            setSwapTxs(result.swap?.transactions ?? null);
            setNativeError(null);
          } else {
            setNativeError(`Swap failed: ${result.reason ?? "unknown"} ${result.error?.message ?? ""}`);
          }
          return;
        } else {
          // If SDK returned something else (or void), still treat as success (the SDK UI likely opened)
          setNativeError("swapToken invoked (no structured result returned).");
          return;
        }
      }
    } catch (err: any) {
      console.error("sdk.actions.swapToken failed:", err);
      setNativeError(`sdk.actions.swapToken threw: ${err?.message ?? String(err)}`);
      return;
    }

    // If we get here, sdk object didn't have the documented actions.swapToken method.
    // Try some fallback names directly on the sdk object.
    try {
      if (typeof sdkObj.swapToken === "function") {
        const result = await sdkObj.swapToken(payload);
        if (result && (result.success === true || result.success === false)) {
          if (result.success) {
            setSwapTxs(result.swap?.transactions ?? null);
            setNativeError(null);
          } else {
            setNativeError(`Swap failed: ${result.reason ?? "unknown"} ${result.error?.message ?? ""}`);
          }
          return;
        }
        setNativeError("swapToken invoked (no structured result returned).");
        return;
      }
      if (typeof sdkObj.swap === "function") {
        // some implementations expect (sellToken, buyToken, sellAmount)
        const args = sellAmount ? [sellToken, buyToken, sellAmount] : [sellToken, buyToken];
        const result = await sdkObj.swap(...args);
        if (result && (result.success === true || result.success === false)) {
          if (result.success) {
            setSwapTxs(result.swap?.transactions ?? null);
            setNativeError(null);
          } else {
            setNativeError(`Swap failed: ${result.reason ?? "unknown"} ${result.error?.message ?? ""}`);
          }
          return;
        }
        setNativeError("swap invoked (no structured result returned).");
        return;
      }
    } catch (err: any) {
      console.error("Fallback SDK swap invocation threw:", err);
      setNativeError(`Fallback swap invocation threw: ${err?.message ?? String(err)}`);
      return;
    }

    // If we reach here, sdk exists but the expected swapToken method wasn't found.
    setNativeError(
      "Found SDK but it does not expose actions.swapToken. Detected sdk global: " +
        found.name +
        ". If you control the Farcaster client or Base wallet, ensure it exposes sdk.actions.swapToken as documented."
    );
  };

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