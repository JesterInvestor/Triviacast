"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { TRIV_ABI, STAKING_ABI } from "../lib/stakingClient";

const STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_ADDRESS || "";
const TRIV_ADDRESS = process.env.NEXT_PUBLIC_TRIV_ADDRESS || "0xa889a10126024f39a0ccae31d09c18095cb461b8";
const FALLBACK_FROM = "0xfEfb14B992640d50ebb00fa9d9674ae39C607d8b";

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

  // Posted messages feedback
  const [postedMessages, setPostedMessages] = useState<string[] | null>(null);
  const [nativeNotice, setNativeNotice] = useState<string | null>(null);

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

  // Simplified Buy TRIV: post the exact message shapes you provided to the host (parent/top).
  const buyTrivNative = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    setPostedMessages(null);
    setNativeNotice(null);

    const fromAddr = (address as string) || FALLBACK_FROM;
    const token = TRIV_ADDRESS.toLowerCase();
    const metadata = {
      description: "Buy TRIV",
      hostname: "triviacast.xyz",
      faviconUrl: "https://triviacast.xyz/favicon.ico",
      title: "Triviacast — Buy TRIV",
    };

    const payload = {
      sellToken: "eip155:8453/native",
      buyToken: `eip155:8453/erc20:${token}`,
      metadata,
      from: fromAddr,
      chainId: 8453,
    };

    const messages = [
      { type: "miniapp:swap", payload },
      { type: "onchainkit:send", payload },
      { jsonrpc: "2.0", method: "onchainkit.send", params: payload },
      { type: "base:swap", payload },
      { type: "swap", payload },
      { type: "miniapp:action", action: "swap", payload },
    ];

    const posted: string[] = [];
    for (const m of messages) {
      try {
        try {
          window.parent?.postMessage?.(m, "*");
        } catch {}
        try {
          window.top?.postMessage?.(m, "*");
        } catch {}
        posted.push(JSON.stringify(m));
      } catch (err) {
        // ignore individual failures
      }
      // small gap to increase chance host picks up the messages in order
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 120));
    }

    setPostedMessages(posted);
    setNativeNotice(
      "Posted several native swap messages to the host. If you're inside Base App or Farcaster the host may open the swap UI. " +
        "If nothing happens, enable remote web inspector and check host console or paste the posted messages + userAgent here and I'll adapt further."
    );
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
                placeholder="Amount to stake / withdraw (optional for prefill)"
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
            onClick={buyTrivNative}
            className="px-4 py-2 bg-white border rounded font-semibold text-sm text-[#2d1b2e] hover:brightness-95"
            aria-label="Buy TRIV (native)"
            title="Buy TRIV (native)"
            type="button"
          >
            Buy TRIV
          </button>
        </div>
      </div>

      {nativeNotice && (
        <div className="mt-3 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          {nativeNotice}
        </div>
      )}

      {postedMessages && postedMessages.length > 0 && (
        <div className="mt-3 p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <div className="font-semibold mb-1">Posted messages to host (these exact shapes):</div>
          <pre className="whitespace-pre-wrap text-xs max-h-56 overflow-auto">{postedMessages.join("\n\n")}</pre>
        </div>
      )}
    </div>
  );
}