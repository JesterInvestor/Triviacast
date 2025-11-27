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
  // sdk.actions.openMiniApp({ url })
  // Fallback to other SDK method names or window.open
  const tryOpenMiniApp = async (url: string) => {
    // list of candidate globals that might expose the miniapp sdk
    const globalAny = window as any;
    const candidates = [
      // common global from farcaster examples
      globalAny.sdk,
      // possible vendor names / wrappers
      globalAny.farcaster?.sdk,
      globalAny.MiniAppSDK,
      globalAny.miniAppSdk,
      globalAny.farcasterMiniAppSdk,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      try {
        // prefer the official actions.openMiniApp API shape
        if (candidate.actions && typeof candidate.actions.openMiniApp === "function") {
          await candidate.actions.openMiniApp({ url });
          return true;
        }
        // also accept direct openMiniApp on the candidate
        if (typeof candidate.openMiniApp === "function") {
          // some implementations accept an object, others accept a string
          try {
            await candidate.openMiniApp({ url });
          } catch {
            await candidate.openMiniApp(url);
          }
          return true;
        }
        if (typeof candidate.openMiniapp === "function") {
          try {
            await candidate.openMiniapp({ url });
          } catch {
            await candidate.openMiniapp(url);
          }
          return true;
        }
      } catch (err) {
        // If the SDK throws, treat as failure and continue to next candidate
        console.error("MiniApp open attempt failed on candidate:", err);
      }

      // Last resort: try other usual open/navigate methods on the candidate
      try {
        if (typeof candidate.open === "function") {
          await candidate.open(url);
          return true;
        }
        if (typeof candidate.openUrl === "function") {
          await candidate.openUrl(url);
          return true;
        }
        if (typeof candidate.navigate === "function") {
          await candidate.navigate(url);
          return true;
        }
      } catch (err) {
        // ignore and continue
      }
    }

    return false;
  };

  const openMintClubSDK = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    const url = "https://mint.club/staking/base/160";

    try {
      const ok = await tryOpenMiniApp(url);
      if (ok) return;
    } catch (err) {
      console.error("openMintClubSDK failed:", err);
    }

    // Fallback to a simple window.open if SDK-based navigation isn't available
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // --- MintClub SDK integration (attempt dynamic import and safe call) ---
  const [mintNetwork, setMintNetwork] = useState<string>("base");
  const [mintToken, setMintToken] = useState<string>("CHICKEN");
  const [mintQuantity, setMintQuantity] = useState<string>("1");
  const [mintLoading, setMintLoading] = useState(false);
  const [mintStatus, setMintStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [mintResult, setMintResult] = useState<string | null>(null);

  const tryMintWithSDK = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    if (!isConnected) {
      setMintStatus("error");
      setMintResult("Connect your wallet to mint.");
      return;
    }

    setMintLoading(true);
    setMintStatus("pending");
    setMintResult(null);

    try {
      // attempt dynamic import; if not installed this will throw and we fallback to opening Mint Club
      const sdkMod = await import("mint.club-v2-sdk");
      // `mintclub` may be exported as named or default
      const mintclub = (sdkMod as any).mintclub ?? (sdkMod as any).default ?? (sdkMod as any);

      const networkArg = mintNetwork || "base";
      const tokenArg = mintToken || "CHICKEN";
      const qty = Math.max(1, Math.floor(Number(mintQuantity) || 1));

      // follow documented pattern: mintclub.network(...).token(...)
      const tokenObj = mintclub.network(networkArg).token(tokenArg);

      // try common method names used by mint SDKs, be permissive
      if (typeof tokenObj.mint === "function") {
        const resp = await tokenObj.mint({ to: address, quantity: qty });
        setMintStatus("success");
        setMintResult(String(resp?.transactionHash ?? resp?.txHash ?? resp?.url ?? JSON.stringify(resp)));
        setMintLoading(false);
        return;
      }

      if (typeof tokenObj.mintTo === "function") {
        const resp = await tokenObj.mintTo(address, qty);
        setMintStatus("success");
        setMintResult(String(resp?.transactionHash ?? resp?.txHash ?? resp?.url ?? JSON.stringify(resp)));
        setMintLoading(false);
        return;
      }

      if (typeof tokenObj.purchase === "function") {
        const resp = await tokenObj.purchase({ quantity: qty, to: address });
        setMintStatus("success");
        setMintResult(String(resp?.transactionHash ?? resp?.txHash ?? resp?.url ?? JSON.stringify(resp)));
        setMintLoading(false);
        return;
      }

      // If SDK doesn't expose a minting function, try opening a UI if available
      if (typeof tokenObj.open === "function") {
        try {
          await tokenObj.open({ network: networkArg, token: tokenArg });
          setMintStatus("success");
          setMintResult("Opened MintClub UI");
          setMintLoading(false);
          return;
        } catch (err) {
          // ignore and fallback
        }
      }

      // nothing worked: fallback to opening Mint Club web URL
      setMintStatus("error");
      setMintResult("SDK present but mint method not found; falling back to web UI.");
      openMintClubSDK();
    } catch (err) {
      // dynamic import failed or call errored — fallback to open URL
      console.warn("MintClub SDK not available or mint failed:", err);
      setMintStatus("error");
      setMintResult("MintClub SDK unavailable — opening web UI.");
      try {
        openMintClubSDK();
      } catch (e) {
        // last resort: nothing we can do
      }
    } finally {
      setMintLoading(false);
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

      {/* Mint Club integration panel */}
      <div className="mt-4 p-4 rounded-lg bg-white/95 border border-gray-200 shadow-sm">
        <h3 className="text-sm font-semibold mb-2">Mint in Mint Club</h3>
        <p className="text-xs text-gray-600 mb-3">Quick mint using the Mint Club SDK when available, otherwise opens Mint Club web UI.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="px-3 py-2 rounded border border-gray-200 text-sm w-full"
            placeholder="Network (e.g. base or chain id)"
            value={mintNetwork}
            onChange={(e) => setMintNetwork(e.target.value)}
            aria-label="MintClub network"
          />
          <input
            className="px-3 py-2 rounded border border-gray-200 text-sm w-full"
            placeholder="Token symbol or address (e.g. CHICKEN)"
            value={mintToken}
            onChange={(e) => setMintToken(e.target.value)}
            aria-label="Token symbol or address"
          />
          <input
            className="px-3 py-2 rounded border border-gray-200 text-sm w-full"
            placeholder="Quantity"
            value={mintQuantity}
            onChange={(e) => setMintQuantity(e.target.value)}
            inputMode="numeric"
            aria-label="Quantity to mint"
          />
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={tryMintWithSDK}
            disabled={mintLoading}
            className="px-4 py-2 rounded bg-[#00E6B8] text-black font-semibold text-sm shadow hover:brightness-95 disabled:opacity-60"
          >
            {mintLoading ? "Minting…" : "Mint"}
          </button>
          <button
            onClick={openMintClubSDK}
            className="px-4 py-2 rounded bg-white border text-sm"
            type="button"
          >
            Open Web UI
          </button>
        </div>

        <div className="mt-3 text-sm text-gray-700">
          {mintStatus !== "idle" && (
            <div className="break-words">
              <strong>Status:</strong> {mintStatus}
              {mintResult && (
                <div className="mt-1">
                  {/* If mintResult looks like a URL, link it; otherwise just show brief text */}
                  {/^https?:\/\//i.test(mintResult) ? (
                    <a href={mintResult} target="_blank" rel="noreferrer" className="text-blue-700">
                      Open result
                    </a>
                  ) : mintResult.length > 0 && /^[0-9a-fA-F]{64}$/.test(mintResult) ? (
                    <a className="text-blue-700" target="_blank" rel="noreferrer" href={`https://basescan.org/tx/${mintResult}`}>
                      View tx
                    </a>
                  ) : (
                    <div className="text-xs text-gray-600">{mintResult}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}