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
      // Farcaster / generic candidate
      globalAny.sdk,
      // possible vendor names / wrappers
      globalAny.farcaster?.sdk,
      globalAny.MiniAppSDK,
      globalAny.miniAppSdk,
      globalAny.farcasterMiniAppSdk,
      // Base-related SDK candidates (common naming patterns)
      globalAny.baseSDK,
      globalAny.BaseSDK,
      globalAny.BaseWallet,
      globalAny.baseWallet,
      globalAny.base,
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

  // New: Open buy TRIV via Farcaster or Base SDK (fallback to Uniswap on Base)
  const openBuyTRIV = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    const tokenAddress = TRIV_ADDRESS || "0xa889A10126024F39A0ccae31D09C18095CB461B8";

    // Uniswap URL pre-filled for Base (chain id 8453). This is a broadly compatible web swap UI:
    const uniswapUrl = `https://app.uniswap.org/#/swap?chain=8453&inputCurrency=ETH&outputCurrency=${encodeURIComponent(tokenAddress)}`;

    // First try Farcaster / mini-app open which some Farcaster clients will route to the in-app browser or Base integration
    try {
      const ok = await tryOpenMiniApp(uniswapUrl);
      if (ok) return;
    } catch (err) {
      console.error("tryOpenMiniApp for buy TRIV failed:", err);
    }

    // Next try invoking Base wallet SDKs directly if present and expose a swap / openSwap API
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

        // try high-level swap-like method if available
        try {
          if (typeof candidate.swap === "function") {
            // common param shape { sellToken, buyToken, chainId }
            try {
              await candidate.swap({ sellToken: "ETH", buyToken: tokenAddress, chainId: 8453 });
            } catch {
              await candidate.swap("ETH", tokenAddress, 8453);
            }
            return;
          }
          if (typeof candidate.openSwap === "function") {
            try {
              await candidate.openSwap({ sellToken: "ETH", buyToken: tokenAddress, chainId: 8453 });
            } catch {
              await candidate.openSwap(`sell=ETH&buy=${tokenAddress}&chain=8453`);
            }
            return;
          }
        } catch (err) {
          console.error("candidate.swap/openSwap attempt failed:", err);
        }

        // try generic open/openUrl methods on candidate
        try {
          if (typeof candidate.open === "function") {
            await candidate.open(uniswapUrl);
            return;
          }
          if (typeof candidate.openUrl === "function") {
            await candidate.openUrl(uniswapUrl);
            return;
          }
          if (typeof candidate.navigate === "function") {
            await candidate.navigate(uniswapUrl);
            return;
          }
        } catch (err) {
          // continue to next candidate
        }
      }
    } catch (err) {
      console.error("Base SDK attempts failed:", err);
    }

    // Try base:// deep link (some mobile apps register these). If it fails, it will simply not navigate.
    try {
      const deepLink = `base://open?url=${encodeURIComponent(uniswapUrl)}`;
      window.open(deepLink, "_blank", "noopener,noreferrer");
      // give the deep link a moment; also open the web fallback after a short delay
      setTimeout(() => {
        window.open(uniswapUrl, "_blank", "noopener,noreferrer");
      }, 600);
      return;
    } catch (err) {
      // final fallback
    }

    // Final fallback: open the Uniswap swap page in the browser
    window.open(uniswapUrl, "_blank", "noopener,noreferrer");
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
      {/* deeplinks for MetaMask, Rainbow, Mint Club, and the new Farcaster/Base SDK "Buy TRIV" button */}
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

          {/* Buy TRIV: first try Farcaster / Base SDKs, then fallback to Uniswap on Base chain */}
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