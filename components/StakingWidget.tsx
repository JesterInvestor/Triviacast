"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { TRIV_ABI, STAKING_ABI } from "../lib/stakingClient";

/**
 * StakingWidget — improved "Buy TRIV" native attempt with broader host messaging
 *
 * Changes in this version:
 * - Keeps the Farcaster sdk.actions.swapToken attempt (where available).
 * - If no SDK globals are present (your Detect output showed none), sends a set of
 *   postMessage variants to window.parent and window.top that many hosts / MiniKit
 *   integrations listen for. The messages cover several common shapes:
 *     - { type: "miniapp:swap", ... }
 *     - { type: "onchainkit:send", ... } (json-rpc-like)
 *     - { jsonrpc: "2.0", method: "onchainkit.send", params: ... }
 *     - { type: "base:swap", ... }
 *   The payloads include CAIP-19 asset IDs and metadata for transaction trays (per your "Custom Transaction Trays" reference).
 * - If postMessage variants are posted, the UI reports that a request was posted (the host must support it).
 * - If nothing is detected and postMessage fails to trigger anything, shows helpful diagnostics (detected globals + userAgent) and next steps.
 *
 * Why this should help:
 * - Your Detect SDK output showed every global probe as missing. Many Mini App hosts do not expose a global on window,
 *   and instead the proper integration is via postMessage between the iframe and the host. By broadcasting multiple
 *   message shapes we increase the chance the host will respond and open the native swap UI.
 *
 * How to proceed if this still doesn't work:
 * 1. Open the page in the Base app (or Farcaster mobile) and press "Detect SDK" — if you still see no globals copy the "Diagnostics" block and paste it here.
 * 2. If possible, enable remote web inspector and paste console logs for the page when you press "Buy TRIV".
 * 3. As a last resort we can add a web fallback (Uniswap/Matcha) — but you previously asked to avoid web fallbacks.
 */

const STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_ADDRESS || "";
const TRIV_ADDRESS = process.env.NEXT_PUBLIC_TRIV_ADDRESS || "";

type DetectionEntry = {
  location: string;
  globalName: string;
  exists: boolean;
  type?: string;
  hasActions?: boolean;
  actionsHasSwapToken?: boolean;
  hasSwapToken?: boolean;
  hasSwap?: boolean;
  hasOpenMiniApp?: boolean;
  hasWalletSend?: boolean;
  sampleMethods?: string[];
};

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

  // diagnostics + results
  const [detecting, setDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState<DetectionEntry[] | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [swapResult, setSwapResult] = useState<any | null>(null);
  const [postedMessages, setPostedMessages] = useState<string[] | null>(null);
  const [ua, setUa] = useState<string>("");

  useEffect(() => {
    setUa(typeof navigator !== "undefined" ? navigator.userAgent : "");
  }, []);

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

  // safe access helper
  const safeGet = (root: any, key: string) => {
    try {
      return root?.[key];
    } catch {
      return undefined;
    }
  };

  const sampleMethods = (obj: any, limit = 12) => {
    try {
      if (!obj || (typeof obj !== "object" && typeof obj !== "function")) return [];
      const names = new Set<string>();
      Object.getOwnPropertyNames(obj || {}).forEach((n) => names.add(n));
      try {
        const proto = Object.getPrototypeOf(obj);
        if (proto) Object.getOwnPropertyNames(proto || {}).forEach((n) => names.add(n));
      } catch {}
      const arr = Array.from(names);
      const funcs = arr.filter((n) => {
        try {
          return typeof (obj as any)[n] === "function";
        } catch {
          return false;
        }
      });
      return funcs.slice(0, limit);
    } catch {
      return [];
    }
  };

  // Detect common SDK globals (non-invasive)
  const detectSdk = async () => {
    setDetecting(true);
    setDetectError(null);
    setDetectionResults(null);
    setSwapResult(null);

    try {
      const toProbe = [
        { location: "window", root: typeof window !== "undefined" ? window : undefined },
        {
          location: "window.parent",
          root: (() => {
            try {
              return window.parent;
            } catch {
              return undefined;
            }
          })(),
        },
        {
          location: "window.top",
          root: (() => {
            try {
              return window.top;
            } catch {
              return undefined;
            }
          })(),
        },
      ];

      const candidateNames = [
        "sdk",
        "farcaster",
        "farcasterSdk",
        "farcasterSDK",
        "farcasterMiniAppSdk",
        "MiniAppSDK",
        "miniAppSdk",
        "fc",
        "fcSdk",
        "__fc__",
        "base",
        "baseSDK",
        "BaseSDK",
        "BaseWallet",
        "baseWallet",
        "onchainkit",
        "OnchainKit",
        "onchain",
        "wallet",
        "walletSdk",
        "app",
      ];

      const results: DetectionEntry[] = [];

      for (const probe of toProbe) {
        const root = probe.root;
        if (!root) continue;
        for (const name of candidateNames) {
          const obj = safeGet(root, name);
          const exists = typeof obj !== "undefined";
          if (!exists) {
            results.push({
              location: probe.location,
              globalName: name,
              exists: false,
            });
            continue;
          }

          const hasActions = typeof safeGet(obj, "actions") === "object";
          const actionsHasSwapToken = hasActions && typeof safeGet(obj.actions, "swapToken") === "function";
          const hasSwapToken = typeof safeGet(obj, "swapToken") === "function";
          const hasSwap = typeof safeGet(obj, "swap") === "function";
          const hasOpenMiniApp = typeof safeGet(obj, "openMiniApp") === "function" || (obj.actions && typeof safeGet(obj.actions, "openMiniApp") === "function");
          const walletObj = safeGet(obj, "wallet") ?? obj;
          const hasWalletSend = walletObj && typeof safeGet(walletObj, "send") === "function";

          results.push({
            location: probe.location,
            globalName: name,
            exists: true,
            type: typeof obj,
            hasActions,
            actionsHasSwapToken,
            hasSwapToken,
            hasSwap,
            hasOpenMiniApp,
            hasWalletSend,
            sampleMethods: sampleMethods(obj, 12),
          });
        }
      }

      setDetectionResults(results);
    } catch (err: any) {
      console.error("detectSdk error:", err);
      setDetectError(String(err?.message ?? err));
    } finally {
      setDetecting(false);
    }
  };

  // Wait briefly for known SDK injection points
  const waitForSdk = async (timeoutMs = 3000, intervalMs = 200) => {
    const start = Date.now();
    const candidateGetters: Array<() => { name: string; obj: any } | null> = [
      () => ({ name: "window.sdk", obj: (window as any).sdk }),
      () => ({ name: "window.farcaster?.sdk", obj: (window as any).farcaster?.sdk }),
      () => ({ name: "window.farcasterSdk", obj: (window as any).farcasterSdk }),
      () => ({ name: "window.farcasterMiniAppSdk", obj: (window as any).farcasterMiniAppSdk }),
      () => ({ name: "window.MiniAppSDK", obj: (window as any).MiniAppSDK }),
      () => ({ name: "window.miniAppSdk", obj: (window as any).miniAppSdk }),
      () => ({ name: "window.base", obj: (window as any).base }),
      () => ({ name: "window.onchainkit", obj: (window as any).onchainkit }),
      () => ({ name: "window.parent.sdk", obj: (() => { try { return (window.parent as any)?.sdk; } catch { return undefined; } })() }),
      () => ({ name: "window.top.sdk", obj: (() => { try { return (window.top as any)?.sdk; } catch { return undefined; } })() }),
    ];

    while (Date.now() - start < timeoutMs) {
      for (const getter of candidateGetters) {
        try {
          const got = getter();
          if (got && got.obj) return got;
        } catch {}
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    for (const getter of candidateGetters) {
      try {
        const got = getter();
        if (got && got.obj) return got;
      } catch {}
    }
    return null;
  };

  // Build metadata for transaction tray per documentation
  const buildMetadata = () => {
    const hostname = typeof window !== "undefined" ? window.location.hostname : "triviacast";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return {
      description: "Buy TRIV",
      hostname,
      faviconUrl: `${origin}/favicon.ico`,
      title: "Triviacast — Buy TRIV",
    };
  };

  // Broad postMessage shapes we will try (host may listen for one of these)
  const makePostMessageVariants = (payload: any) => {
    return [
      // Simple intent
      { type: "miniapp:swap", payload },
      // onchainkit-style 'send' wrapper
      { type: "onchainkit:send", payload },
      // JSON-RPC-like for hosts that route RPC
      { jsonrpc: "2.0", method: "onchainkit.send", params: payload },
      // Alternate method name
      { type: "base:swap", payload },
      // generic swap intent
      { type: "swap", payload },
      // Name the intent in an envelope
      { type: "miniapp:action", action: "swap", payload },
    ];
  };

  // Attempt to post messages to parent/top and record which we posted
  const postMessageToHost = async (messages: any[]) => {
    const posted: string[] = [];
    try {
      for (const m of messages) {
        try {
          // post to parent and top safely
          try {
            window.parent?.postMessage?.(m, "*");
          } catch {}
          try {
            window.top?.postMessage?.(m, "*");
          } catch {}
          posted.push(JSON.stringify(m));
        } catch (err) {
          // continue
        }
        // small delay between posts to increase chance host picks one up in order
        // (some hosts inspect first message only)
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 120));
      }
    } catch (err) {
      console.error("postMessageToHost error:", err);
    }
    return posted;
  };

  // Main Buy TRIV native flow:
  // 1) Try Farcaster sdk.actions.swapToken
  // 2) If none found, send a series of postMessage variants to the host
  // 3) As fallback attempt base:// deep link to hint host app
  const trySwapToken = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    setDetectError(null);
    setSwapResult(null);
    setPostedMessages(null);

    if (!TRIV_ADDRESS) {
      setDetectError("TRIV contract address not configured (NEXT_PUBLIC_TRIV_ADDRESS).");
      return;
    }

    const sellToken = "eip155:8453/native";
    const buyToken = `eip155:8453/erc20:${TRIV_ADDRESS.toLowerCase()}`;

    let sellAmount: string | undefined = undefined;
    if (amount && amount.trim() !== "") {
      try {
        sellAmount = ethers.parseUnits(amount.trim(), 18).toString();
      } catch (err) {
        console.warn("Could not parse sell amount:", err);
      }
    }

    const farcasterPayload: any = { sellToken, buyToken };
    if (sellAmount) farcasterPayload.sellAmount = sellAmount;

    // 1) Try Farcaster SDK if present
    try {
      const found = await waitForSdk(2000, 150);
      if (found && found.obj) {
        const sdkObj = found.obj;
        if (sdkObj.actions && typeof sdkObj.actions.swapToken === "function") {
          const res = await sdkObj.actions.swapToken(farcasterPayload);
          setSwapResult({ method: `${found.name}.actions.swapToken`, result: res });
          return;
        }
        if (typeof sdkObj.swapToken === "function") {
          const res = await sdkObj.swapToken(farcasterPayload);
          setSwapResult({ method: `${found.name}.swapToken`, result: res });
          return;
        }
      }
    } catch (err) {
      console.warn("Farcaster attempt threw:", err);
    }

    // 2) PostMessage variants (host-driven integrations often listen for postMessage)
    try {
      const metadata = buildMetadata();
      const hostPayload = {
        sellToken,
        buyToken,
        sellAmount: sellAmount || undefined,
        metadata,
        from: address ?? undefined,
        chainId: 8453,
      };

      const variants = makePostMessageVariants(hostPayload);
      const posted = await postMessageToHost(variants);
      setPostedMessages(posted);

      // Give the host a moment to react; show message to user explaining what's happened
      setDetectError(
        "Posted native swap requests to the host (several message shapes). If you're inside Base App or Farcaster, the host may open the swap UI. " +
          "If nothing happens, press Detect SDK and paste the detection JSON here so I can adapt to the exact integration the host exposes."
      );

      // Try a base:// deep link as an additional hint (mobile only). We won't open a web Uniswap fallback.
      try {
        const deepLink = `base://swap?sellToken=ETH&buyToken=${encodeURIComponent(TRIV_ADDRESS)}`;
        // Try assign first (works in many in-app browsers), then open
        try {
          window.location.assign(deepLink);
        } catch {}
        setTimeout(() => {
          try {
            window.open(deepLink, "_blank");
          } catch {}
        }, 250);
      } catch {}
      return;
    } catch (err) {
      console.error("postMessage variants failed:", err);
    }

    // 3) Final diagnostics: nothing worked
    setDetectError(
      "No native SDK detected and host postMessage attempts were sent but there was no visible response. " +
        "Please paste the 'SDK detection results' JSON and the browser userAgent shown below so I can tailor the exact call to your environment."
    );
  };

  const openMintClub = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    const url = "https://mint.club/staking/base/160";
    // Try Farcaster open first if present
    try {
      const sdk = (window as any).sdk ?? (window as any).farcaster?.sdk;
      if (sdk && sdk.actions && typeof sdk.actions.openMiniApp === "function") {
        await sdk.actions.openMiniApp({ url });
        return;
      }
      if (sdk && typeof sdk.openMiniApp === "function") {
        try {
          await sdk.openMiniApp({ url });
        } catch {
          await sdk.openMiniApp(url);
        }
        return;
      }
    } catch {}
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

  const format6 = (val: string) => {
    try {
      const n = Number(val);
      if (!isFinite(n)) return "0.000000";
      return n.toFixed(6);
    } catch (e) {
      return "0.000000";
    }
  };

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
            onClick={openMintClub}
            className="px-4 py-2 bg-[#FFC4D1] rounded font-semibold text-sm text-[#2d1b2e] hover:brightness-95"
            aria-label="Open in Mint Club"
            title="Open in Mint Club"
            type="button"
          >
            Open in Mint Club
          </button>

          <button
            onClick={detectSdk}
            disabled={detecting}
            className="px-4 py-2 bg-white border rounded font-semibold text-sm text-[#2d1b2e] hover:brightness-95"
            aria-label="Detect SDK"
            title="Detect Farcaster/Base SDK in this environment"
            type="button"
          >
            {detecting ? "Detecting…" : "Detect SDK"}
          </button>

          <button
            onClick={trySwapToken}
            className="px-4 py-2 bg-white border rounded font-semibold text-sm text-[#2d1b2e] hover:brightness-95"
            aria-label="Buy TRIV (native)"
            title="Buy TRIV (native)"
            type="button"
          >
            Buy TRIV
          </button>
        </div>
      </div>

      {/* Diagnostics */}
      <div className="mt-4">
        {detectError && (
          <div className="p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm mb-3">
            {detectError}
          </div>
        )}

        {detectionResults && detectionResults.length > 0 && (
          <div className="p-3 rounded bg-gray-50 border border-gray-200 text-sm text-gray-900 mb-3">
            <div className="font-semibold mb-2">SDK detection results (copy & paste here if things fail):</div>
            <pre className="whitespace-pre-wrap text-xs max-h-56 overflow-auto">
              {JSON.stringify(detectionResults, null, 2)}
            </pre>
            <div className="mt-2 text-xs text-gray-600">
              If you see an entry with exists:true and actionsHasSwapToken:true (or hasWalletSend:true), press Buy TRIV.
              If nothing works, paste this JSON into the chat and I will adapt the call to the exact global/method your client exposes.
            </div>
          </div>
        )}

        {postedMessages && postedMessages.length > 0 && (
          <div className="p-3 rounded bg-blue-50 border border-blue-200 text-sm text-blue-800 mb-3">
            <div className="font-semibold mb-1">Posted messages to host (multiple shapes):</div>
            <pre className="whitespace-pre-wrap text-xs max-h-56 overflow-auto">{postedMessages.join("\n\n")}</pre>
            <div className="mt-2 text-xs text-gray-600">
              If the host supports a message shape above it should open the native swap UI. If nothing happens, please paste the detection JSON + this userAgent:
              <div className="mt-1 font-mono text-xs">{ua}</div>
            </div>
          </div>
        )}

        {swapResult && (
          <div className="p-3 rounded bg-green-50 border border-green-200 text-sm text-green-800 mb-3">
            <div className="font-semibold mb-1">Swap invocation result:</div>
            <pre className="whitespace-pre-wrap text-xs max-h-56 overflow-auto">{JSON.stringify(swapResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}