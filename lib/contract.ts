import { readContract, writeContract, waitForTransactionReceipt, simulateContract, getAccount } from "@wagmi/core";
import { base, baseSepolia } from "viem/chains";
import { wagmiConfig } from "./wagmi";
import * as log from './logger';

// Contract ABI - only the functions we need
// We include the standard Solidity error types so libraries like viem can
// decode revert reasons when they are returned from the node/provider.
const STANDARD_ERROR_ABI = [
  // The generic Error(string) encoded as: Error(string)
  { "type": "error", "name": "Error", "inputs": [{ "name": "", "type": "string" }] },
  // Solidity Panic(uint256) for built-in assertions (0x4e487b71)
  { "type": "error", "name": "Panic", "inputs": [{ "name": "", "type": "uint256" }] }
] as const;

// Application ABI (functions required by the frontend)
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "wallet", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "addPoints",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "wallet", "type": "address" }
    ],
    "name": "getPoints",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "limit", "type": "uint256" }
    ],
    "name": "getLeaderboard",
    "outputs": [
      { "internalType": "address[]", "name": "addresses", "type": "address[]" },
      { "internalType": "uint256[]", "name": "points", "type": "uint256[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalWallets",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Helper to merge contract ABI with error ABI entries so callers can pass
// an ABI that includes errors. This is a lightweight, non-destructive
// merge used when instantiating contracts with libraries that decode
// error signatures (like viem).
export function extendAbiWithErrors<T extends readonly any[]>(abi: T) {
  // We return a new array combining the provided abi and the standard error types.
  // Keep the original types intact; this is a simple runtime helper.
  // Cast to unknown to avoid excessive TypeScript inference complexity here.
  return ([...abi, ...(STANDARD_ERROR_ABI as any)] as unknown) as T & typeof STANDARD_ERROR_ABI;
}

// Get contract address from environment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
const activeChain = CHAIN_ID === 8453 ? base : baseSepolia;

// Check if contract is configured
export function isContractConfigured(): boolean {
  const configured = !!CONTRACT_ADDRESS;
  // Helpful debug for runtime checks
  if (!configured) {
    try {
      log.info('[Triviacast] contract not configured', { CONTRACT_ADDRESS });
    } catch (_e) {}
  }
  return configured;
}

// Contract helpers (address/abi)
const CONTRACT_ABI_WITH_ERRORS = extendAbiWithErrors(CONTRACT_ABI as any);

/**
 * Add T points to a wallet address on the blockchain
 * @param account The user's connected account
 * @param walletAddress The wallet address to add points to
 * @param points The amount of points to add
 * @returns Transaction receipt
 */
export async function addPointsOnChain(
  walletAddress: string,
  points: number
): Promise<`0x${string}`> {
  if (!isContractConfigured()) {
    throw new Error("Smart contract not configured");
  }
  log.info('[Triviacast] addPointsOnChain', { contract: CONTRACT_ADDRESS, chainId: CHAIN_ID, walletAddress, points });
  // Sanity check: ensure the connected account address matches the target wallet
  try {
    const acc = getAccount(wagmiConfig);
    const activeAddress = acc?.address;
    if (!activeAddress) {
      throw new Error('No active account address available for signing');
    }

    if (activeAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error(`Connected account (${activeAddress}) does not match target wallet (${walletAddress}). The contract requires the caller to be the target wallet.`);
    }
    } catch (e) {
    log.error(e, { context: 'addPointsOnChain.precheck' });
    throw e;
  }
  try {
    // Simulate to estimate gas, then write and wait for receipt
    // Use the active connected account when building the tx simulation/write request.
    // This helps connectors like WalletConnect / injected wallets (Base) correctly
    // provide a signer for the transaction.
    const accInfo = getAccount(wagmiConfig);
    const simulationAccount = (accInfo?.address ?? walletAddress) as `0x${string}`;
    const { request } = await simulateContract(wagmiConfig, {
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI_WITH_ERRORS as any,
      functionName: 'addPoints',
      args: [walletAddress as `0x${string}`, BigInt(points)],
      chainId: activeChain.id,
      account: simulationAccount,
    });

    try {
      const hash = await writeContract(wagmiConfig, request);
      await waitForTransactionReceipt(wagmiConfig, { hash, chainId: activeChain.id });
      return hash;
    } catch (writeError) {
    log.warn('[Triviacast] writeContract failed, attempting eth_sendTransaction fallback', { err: String(writeError) });

      // Fallback: attempt to use the injected provider directly (window.ethereum)
      try {
        const w = (globalThis as any) as any;
        if (w?.ethereum && typeof w.ethereum.request === 'function') {
          // Treat request as any to avoid strict typing issues from viem/wagmi
          const reqAny: any = request as any;
          const tx: any = {
            from: simulationAccount,
            to: reqAny.to ?? reqAny.address ?? CONTRACT_ADDRESS,
            data: reqAny.data ?? reqAny.calldata ?? reqAny.input ?? reqAny?.request?.data ?? null,
          };

          if (reqAny.value) {
            try {
              const v = BigInt(reqAny.value as any);
              tx.value = `0x${v.toString(16)}`;
            } catch (_vErr) {
              // ignore conversion error
            }
          }

          if (reqAny.gas || reqAny.gasLimit) {
            const g = reqAny.gas ?? reqAny.gasLimit;
            try {
              const gv = BigInt(g as any);
              tx.gas = `0x${gv.toString(16)}`;
            } catch (_gErr) {
              // ignore
            }
          }

          const sendResult = await w.ethereum.request({ method: 'eth_sendTransaction', params: [tx] });
          const txHash = sendResult as string;
          log.info('[Triviacast] eth_sendTransaction fallback sent tx', { txHash });
          await waitForTransactionReceipt(wagmiConfig, { hash: txHash as `0x${string}`, chainId: activeChain.id });
          return txHash as `0x${string}`;
        }
      } catch (fallbackErr) {
        log.error(fallbackErr, { context: 'eth_sendTransaction.fallback' });
      }

      // If fallback did not work, rethrow the original write error to surface it.
      throw writeError;
    }
    } catch (error: any) {
    // Try to surface a revert reason if available
    log.error(error, { context: 'addPointsOnChain.transaction', details: error?.message || String(error) });
    throw error;
  }
}

/**
 * Get T points for a specific wallet address from the blockchain
 * @param walletAddress The wallet address to query
 * @returns The total T points
 */
export async function getPointsFromChain(walletAddress: string): Promise<number> {
  if (!isContractConfigured()) {
    return 0;
  }

  try {
    const result = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI_WITH_ERRORS as any,
      functionName: 'getPoints',
      args: [walletAddress as `0x${string}`],
      chainId: activeChain.id,
    });
    return Number(result as unknown as bigint);
  } catch (error) {
    log.error(error, { context: 'getPointsFromChain', walletAddress });
    return 0;
  }
}

/**
 * Get the leaderboard from the blockchain
 * @param limit Maximum number of entries to return (default: 100)
 * @returns Array of leaderboard entries with wallet addresses and points
 */
export async function getLeaderboardFromChain(limit: number = 100): Promise<Array<{ walletAddress: string; tPoints: number }>> {
  if (!isContractConfigured()) {
    return [];
  }

  try {
    log.info('[Triviacast] getLeaderboardFromChain calling', { contract: CONTRACT_ADDRESS, chainId: CHAIN_ID, limit });
    const result = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI_WITH_ERRORS as any,
      functionName: 'getLeaderboard',
      args: [BigInt(limit)],
      chainId: activeChain.id,
    });

    const [addresses, points] = result as [string[], bigint[]];
    log.info('[Triviacast] getLeaderboardFromChain result', { count: addresses.length, sample: addresses.slice(0, 5) });
    return addresses.map((address, index) => ({
      walletAddress: address,
      tPoints: Number(points[index]),
    }));
  } catch (error) {
    log.error(error, { context: 'getLeaderboardFromChain' });
    return [];
  }
}

/**
 * Get the total number of wallets with points from the blockchain
 * @returns The total number of wallets
 */
export async function getTotalWalletsFromChain(): Promise<number> {
  if (!isContractConfigured()) {
    return 0;
  }

  try {
    log.info('[Triviacast] getTotalWalletsFromChain calling', { contract: CONTRACT_ADDRESS, chainId: CHAIN_ID });
    const result = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI_WITH_ERRORS as any,
      functionName: 'getTotalWallets',
      args: [],
      chainId: activeChain.id,
    });
    const total = Number(result as unknown as bigint);
    log.info('[Triviacast] getTotalWalletsFromChain result', { total });
    return total;
  } catch (error) {
    log.error(error, { context: 'getTotalWalletsFromChain' });
    return 0;
  }
}
