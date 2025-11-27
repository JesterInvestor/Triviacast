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

  // Use Farcaster Mini App SDK's openMiniApp when available:
  // sdk.actions.openMiniApp({ url }) or sdk.actions.openMiniApp({ name, params }) depending on SDK
  // Fallbacks below try common Base SDK globals and methods, but NO web fallbacks are used here.
  const tryOpenMiniApp = async (payload: any) => {
    const globalAny = window as any;
    const candidates = [
      globalAny.sdk,
      globalAny.farcaster?.sdk,
      globalAny.MiniAppSDK,
      globalAny.miniAppSdk,
      globalAny.farcasterMiniAppSdk,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        // prefer actions.openMiniApp with a URL or structured payload
        if (candidate.actions && typeof candidate.actions.openMiniApp === "function") {
          await candidate.actions.openMiniApp(payload);
          return true;
        }
        // direct openMiniApp variants
        if (typeof candidate.openMiniApp === "function") {
          try {
            await candidate.openMiniApp(payload);
          } catch {
            // try calling with payload.url if payload is an object
            if (payload && payload.url) {
              await candidate.openMiniApp(payload.url);
            } else {
              await candidate.openMiniApp(String(payload));
            }
          }
          return true;
        }
        if (typeof candidate.openMiniapp === "function") {
          try {
            await candidate.openMiniapp(payload);
          } catch {
            if (payload && payload.url) {
              await candidate.openMiniapp(payload.url);
            } else {
              await candidate.openMiniapp(String(payload));
            }
          }
          return true;
        }
      } catch (err) {
        console.error("MiniApp open attempt failed on candidate:", err);
      }
    }

    return false;
  };

  const openMintClubSDK = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    const url = "https://mint.club/staking/base/160";

    try {
      const ok = await tryOpenMiniApp({ url });
      if (ok) return;
    } catch (err) {
      console.error("openMintClubSDK failed:", err);
    }

    // Fallback to a simple window.open if SDK-based navigation isn't available
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Native-only Buy TRIV flow:
  // - Try Farcaster mini app using structured payloads (no web fallback)
  // - Try Base-native SDK globals and their swap/openSwap methods
  // - If no native SDK found, show an alert (NO web redirect)
  const openBuyTRIV = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    const tokenAddress = TRIV_ADDRESS || "0xa889A10126024F39A0ccae31D09C18095CB461B8";
    const chainId = 8453; // Base chain id used in your app previously

    // 1) Try Farcaster Mini App open with a structured payload (preferred)
    try {
      // Many Farcaster miniapp implementations accept an object like { url } but some accept structured params.
      // We attempt both common shapes but do NOT provide an http web fallback.
      const payloads = [
        // structured params (some SDKs accept { name, params })
        { name: "swap", params: { sellToken: "ETH", buyToken: tokenAddress, chainId } },
        // legacy URL-like scheme that an SDK may map internally
        { url: `base://swap?sellToken=ETH&buyToken=${tokenAddress}&chainId=${chainId}` },
        // generic intent-style payload
        { intent: "swap", sellToken: "ETH", buyToken: tokenAddress, chainId },
      ];

      for (const p of payloads) {
        try {
          const ok = await tryOpenMiniApp(p);
          if (ok) return;
        } catch (err) {
          // try next payload
        }
      }
    } catch (err) {
      console.error("Farcaster mini-app attempts failed:", err);
    }

    // 2) Try Base-native SDK globals: call swap/openSwap if available (native-only)
    try {
      const globalAny = window as any;
      const baseCandidates = [
        globalAny.baseSDK,
        globalAny.BaseSDK,
        globalAny.BaseWallet,
        globalAny.baseWallet,
        globalAny.base,
      ];

      for (const candidate of baseCandidates) {
        if (!candidate) continue;

        // Prefer a structured swap API if present
        try {
          if (typeof candidate.swap === "function") {
            // try structured param object first
            try {
              await candidate.swap({ sellToken: "ETH", buyToken: tokenAddress, chainId });
            } catch {
              // fallback to positional args if provider expects them
              await candidate.swap("ETH", tokenAddress, chainId);
            }
            return;
          }

          if (typeof candidate.openSwap === "function") {
            try {
              await candidate.openSwap({ sellToken: "ETH", buyToken: tokenAddress, chainId });
            } catch {
              await candidate.openSwap(`sell=ETH&buy=${tokenAddress}&chain=${chainId}`);
            }
            return;
          }

          // Some SDKs expose a generic "open" or "openUrl" and might accept a base:// style deep intent
          if (typeof candidate.open === "function") {
            try {
              await candidate.open({ action: "swap", sellToken: "ETH", buyToken: tokenAddress, chainId });
            } catch {
              // best-effort: try with a small structured intent
              await candidate.open({ urlScheme: `base://swap?sellToken=ETH&buyToken=${tokenAddress}&chainId=${chainId}` });
            }
            return;
          }

          if (typeof candidate.openUrl === "function") {
            try {
              await candidate.openUrl({ sellToken: "ETH", buyToken: tokenAddress, chainId });
            } catch {
              await candidate.openUrl(`base://swap?sellToken=ETH&buyToken=${tokenAddress}&chainId=${chainId}`);
            }
            return;
          }
        } catch (err) {
          // move to next candidate if this one failed
          console.error("Base candidate swap/open attempt failed:", err);
        }
      }
    } catch (err) {
      console.error("Base SDK attempts threw:", err);
    }

    // 3) NO web fallbacks per your request. Notify user that native SDK wasn't found.
    try {
      // Use a non-intrusive alert; you can replace this with a UI toast/modal as desired.
      window.alert(
        "No native swap SDK detected. Please open the Base wallet or a Farcaster client with mini-app support to buy TRIV directly from your app."
      );
    } catch (err) {
      // If alerts are blocked, fail silently.
      console.error("Could not display alert about missing native SDK:", err);
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
    // container constrained width but flexible height; allow inner scrolling if outer container small
    <div className="mt-6 w-full max-w-2xl text-left">
      <div className="p-6 rounded-xl bg-white/90 border border-[#F4A6B7] shadow-sm text-gray-900 overflow-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Stake TRIV for Rewards</h2>
        <div className="mb-3">
          <span className="inline-block px-3 py-1 rounded-full bg-[#FFF3F6] text-gray-800 font-semibold text-sm">Current APY: 80%</span>
        </div>
        <p className="text-sm text-gray-700 mb-4">
          You can stake using Base App and Rainbow Wallet. Also works in Farcaster desktop and browser w/ wallet extension — sorry for any inconvenience.
        </p>

        {/* 2 columns on small screens to reduce vertical stacking and avoid overflow; cells can shrink */}
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
              {/* Status area (wraps on narrow screens) */}
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
      {/* deeplinks for MetaMask, Rainbow, Mint Club, and the native-only Buy TRIV button */}
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

          {/* Mint Club: prefer sdk.actions.openMiniApp({ url }) */}
          <button
            onClick={openMintClubSDK}
            className="px-4 py-2 bg-[#FFC4D1] rounded font-semibold text-sm text-[#2d1b2e] hover:brightness-95"
            aria-label="Open in Mint Club"
            title="Open in Mint Club"
            type="button"
          >
            Open in Mint Club
          </button>

          {/* Buy TRIV: native SDKs only (Farcaster / Base SDK). No Uniswap or web fallback per request */}
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
    </div>
  );
}