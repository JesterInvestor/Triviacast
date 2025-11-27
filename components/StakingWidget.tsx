"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { TRIV_ABI, STAKING_ABI } from "../lib/stakingClient";

/**
 * StakingWidget — improved native swap handling for Farcaster + Base Mini Apps
 *
 * What changed (summary)
 * - First attempts the documented Farcaster mini-app API: sdk.actions.swapToken({...})
 * - If that is not present, attempts several Base / OnchainKit / host wallet globals and methods:
 *   - candidate.actions.swapToken(payload)
 *   - candidate.actions.openMiniApp({ name: "swap", params, metadata })
 *   - candidate.wallet?.send(walletPayload) (includes metadata to show a transaction tray per docs)
 *   - fallback: try window.parent.postMessage / window.top.postMessage to ask host to invoke a swap
 * - Includes metadata in wallet.send calls per "Custom Transaction Trays" doc section:
 *   { description, hostname, faviconUrl, title }
 * - Keeps a Detect SDK button and prints detection results so you can paste them if a target
 *   client exposes a different global name / API. This helps me iterate to the exact method your
 *   Farcaster or Base client exposes.
 *
 * Notes
 * - No web Uniswap/Matcha fallbacks here — this tries native SDK/host first and surfaces diagnostics.
 * - The wallet.send payload uses an empty `calls` array so wallets will show a transaction tray with metadata.
 *   If your wallet requires a specific call shape (router + calldata), paste the detection output and I will adapt it.
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

  // helper: safe access to avoid cross-origin errors
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

  // Probe for likely SDK / wallet globals and report capabilities (does not invoke)
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

  // Wait briefly for SDK injection points (some in-app browsers inject after load)
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

  // Main Buy TRIV native flow:
  // 1) Try Farcaster sdk.actions.swapToken
  // 2) Try many Base wallet/onchainkit globals:
  //    - actions.swapToken
  //    - actions.openMiniApp({ name: 'swap', params, metadata })
  //    - wallet.send({ version, from, chainId, calls, metadata })
  // 3) Try postMessage to parent/top to let host handle swap (last resort)
  const trySwapToken = async () => {
    setDetectError(null);
    setSwapResult(null);

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

    // 1) Farcaster SDK
    try {
      const found = await waitForSdk(3000, 200);
      if (found && found.obj) {
        const sdkObj = found.obj;
        // documented method
        if (sdkObj.actions && typeof sdkObj.actions.swapToken === "function") {
          const res = await sdkObj.actions.swapToken(farcasterPayload);
          setSwapResult({ method: `${found.name}.actions.swapToken`, result: res });
          // update detectionResults so you see it
          setDetectionResults((prev) => {
            const entry: DetectionEntry = {
              location: found.name.split(".")[0],
              globalName: found.name,
              exists: true,
              type: typeof sdkObj,
              hasActions: true,
              actionsHasSwapToken: true,
              sampleMethods: sampleMethods(sdkObj, 12),
            };
            return prev ? [entry, ...prev] : [entry];
          });
          return;
        }
        // try other shapes on sdk object
        if (typeof sdkObj.swapToken === "function") {
          const res = await sdkObj.swapToken(farcasterPayload);
          setSwapResult({ method: `${found.name}.swapToken`, result: res });
          return;
        }
        if (typeof sdkObj.swap === "function") {
          const args = sellAmount ? [sellToken, buyToken, sellAmount] : [sellToken, buyToken];
          const res = await sdkObj.swap(...args);
          setSwapResult({ method: `${found.name}.swap`, result: res });
          return;
        }
      }
    } catch (err: any) {
      console.warn("Farcaster attempt threw:", err);
      // continue to other attempts
    }

    // 2) Base / OnchainKit / host wallet candidates
    const metadata = buildMetadata();
    const walletPayload: any = {
      version: "1.0",
      from: address ? (address as `0x${string}`) : undefined,
      chainId: 8453,
      calls: [
        // Intentionally left empty for the wallet to present a transaction tray with our metadata.
        // If your wallet needs a concrete call to a router contract, paste detection output and we'll adjust.
      ],
      metadata,
    };

    const baseCandidates: Array<{ name: string; obj: any }> = [
      { name: "window.base", obj: safeGet(window, "base") },
      { name: "window.base?.wallet", obj: safeGet(safeGet(window, "base"), "wallet") },
      { name: "window.baseSDK", obj: safeGet(window, "baseSDK") },
      { name: "window.BaseSDK", obj: safeGet(window, "BaseSDK") },
      { name: "window.BaseWallet", obj: safeGet(window, "BaseWallet") },
      { name: "window.baseWallet", obj: safeGet(window, "baseWallet") },
      { name: "window.onchainkit", obj: safeGet(window, "onchainkit") },
      { name: "window.OnchainKit", obj: safeGet(window, "OnchainKit") },
      { name: "window.wallet", obj: safeGet(window, "wallet") },
      { name: "window.parent.base", obj: (() => { try { return (window.parent as any)?.base; } catch { return undefined; } })() },
      { name: "window.parent.sdk", obj: (() => { try { return (window.parent as any)?.sdk; } catch { return undefined; } })() },
    ];

    const tried: string[] = [];

    for (const c of baseCandidates) {
      const candidate = c.obj;
      if (!candidate) continue;
      tried.push(c.name);

      // candidate.actions.swapToken?
      try {
        if (candidate.actions && typeof candidate.actions.swapToken === "function") {
          const res = await candidate.actions.swapToken({ sellToken, buyToken, ...(sellAmount ? { sellAmount } : {}) });
          setSwapResult({ method: `${c.name}.actions.swapToken`, result: res });
          setDetectionResults((prev) => {
            const entry: DetectionEntry = {
              location: c.name.split(".")[0],
              globalName: c.name,
              exists: true,
              type: typeof candidate,
              hasActions: true,
              actionsHasSwapToken: true,
              sampleMethods: sampleMethods(candidate, 12),
            };
            return prev ? [entry, ...prev] : [entry];
          });
          return;
        }
      } catch (err) {
        console.warn(`${c.name}.actions.swapToken failed:`, err);
      }

      // candidate.actions.openMiniApp({ name: "swap", params, metadata })
      try {
        if (candidate.actions && typeof candidate.actions.openMiniApp === "function") {
          await candidate.actions.openMiniApp({ name: "swap", params: { sellToken, buyToken, ...(sellAmount ? { sellAmount } : {}) }, metadata });
          setSwapResult({ method: `${c.name}.actions.openMiniApp`, result: "invoked" });
          setDetectionResults((prev) => {
            const entry: DetectionEntry = {
              location: c.name.split(".")[0],
              globalName: c.name,
              exists: true,
              type: typeof candidate,
              hasActions: true,
              hasOpenMiniApp: true,
              sampleMethods: sampleMethods(candidate, 12),
            };
            return prev ? [entry, ...prev] : [entry];
          });
          return;
        }
      } catch (err) {
        console.warn(`${c.name}.actions.openMiniApp failed:`, err);
      }

      // candidate.openMiniApp(...)
      try {
        if (typeof candidate.openMiniApp === "function") {
          try {
            await candidate.openMiniApp({ name: "swap", params: { sellToken, buyToken, ...(sellAmount ? { sellAmount } : {}) }, metadata });
          } catch {
            // Some implementations accept just a URL-like or name string
            await candidate.openMiniApp(`swap?sellToken=${sellToken}&buyToken=${buyToken}`);
          }
          setSwapResult({ method: `${c.name}.openMiniApp`, result: "invoked" });
          return;
        }
      } catch (err) {
        console.warn(`${c.name}.openMiniApp failed:`, err);
      }

      // candidate.wallet?.send(payload) OR candidate.send(payload)
      try {
        const walletObj = candidate?.wallet ?? candidate;
        if (walletObj && typeof walletObj.send === "function") {
          const res = await walletObj.send(walletPayload);
          setSwapResult({ method: `${c.name}.wallet.send`, result: res });
          setDetectionResults((prev) => {
            const entry: DetectionEntry = {
              location: c.name.split(".")[0],
              globalName: c.name,
              exists: true,
              type: typeof candidate,
              hasWalletSend: true,
              sampleMethods: sampleMethods(candidate, 12),
            };
            return prev ? [entry, ...prev] : [entry];
          });
          return;
        }
        if (typeof candidate.send === "function") {
          const res = await candidate.send(walletPayload);
          setSwapResult({ method: `${c.name}.send`, result: res });
          return;
        }
      } catch (err) {
        console.warn(`${c.name}.wallet.send/send failed:`, err);
      }
    }

    // 3) As last resort, ask host via postMessage (parent/top). Many hosts listen for JSON-RPC-like messages.
    try {
      const message = {
        type: "miniapp:swap",
        payload: { sellToken, buyToken, sellAmount: sellAmount || undefined, metadata: buildMetadata() },
      };
      try {
        window.parent?.postMessage?.(message, "*");
      } catch {}
      try {
        window.top?.postMessage?.(message, "*");
      } catch {}
      // show a helpful diagnostic to the user and list what we tried
      setDetectError(
        `No accessible Farcaster or Base SDK method worked. Tried candidates: ${tried.join(", ") || "none"}. ` +
          "A postMessage was sent to the host; if the host supports handling this message it may open the swap UI. " +
          "If you are in Farcaster or Base app and this still fails, press Detect SDK and paste the JSON output shown in the widget so I can adapt the exact global/method names."
      );
      setDetectionResults((prev) => {
        const fallback: DetectionEntry = {
          location: "tried",
          globalName: tried.join(", "),
          exists: tried.length > 0,
          type: "candidates attempted",
        };
        return prev ? [fallback, ...prev] : [fallback];
      });
    } catch (err) {
      console.error("postMessage attempt failed:", err);
      setDetectError("No native SDK found and postMessage to host failed. Please run Detect SDK and paste the output here.");
    }
  };

  const openMintClub = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    const url = "https://mint.club/staking/base/160";
    // try Farcaster open first
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