import { getContract, prepareContractCall, readContract, sendTransaction } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";
import { client } from "./thirdweb";
import type { Account } from "thirdweb/wallets";

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
  const configured = !!(CONTRACT_ADDRESS && client);
  // Helpful debug for runtime checks
  if (!configured) {
    try {
      console.info('[Triviacast] contract not configured', { CONTRACT_ADDRESS, clientPresent: !!client });
    } catch (_e) {}
  }
  return configured;
}

// Get contract instance
function getContractInstance() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }
  if (!client) {
    throw new Error("Thirdweb client not initialized");
  }

  const abiWithErrors = extendAbiWithErrors(CONTRACT_ABI as any);
  return getContract({
    client,
    address: CONTRACT_ADDRESS,
    chain: activeChain,
    abi: abiWithErrors,
  });
}

/**
 * Add T points to a wallet address on the blockchain
 * @param account The user's connected account
 * @param walletAddress The wallet address to add points to
 * @param points The amount of points to add
 * @returns Transaction receipt
 */
export async function addPointsOnChain(
  account: Account,
  walletAddress: string,
  points: number
): Promise<any> {
  if (!isContractConfigured()) {
    throw new Error("Smart contract not configured");
  }
  const contract = getContractInstance();
  console.info('[Triviacast] addPointsOnChain', {
    contract: CONTRACT_ADDRESS,
    chainId: CHAIN_ID,
    walletAddress,
    points
  });
  // Sanity check: ensure the connected account address matches the target wallet
  try {
    const activeAddress = (account as any)?.address;
    if (!activeAddress) {
      throw new Error('No active account address available for signing');
    }

    if (activeAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error(`Connected account (${activeAddress}) does not match target wallet (${walletAddress}). The contract requires the caller to be the target wallet.`);
    }
  } catch (e) {
    console.error('[Triviacast] addPointsOnChain pre-check failed', e);
    throw e;
  }

  const transaction = prepareContractCall({
    contract,
    method: "addPoints",
    params: [walletAddress as `0x${string}`, BigInt(points)],
  });

  try {
    const result = await sendTransaction({
      transaction,
      account,
    });
    return result;
  } catch (error: any) {
    // Try to surface a revert reason if available
    console.error('[Triviacast] addPointsOnChain transaction failed', {
      error: error?.message || error,
      details: error
    });
    // Detect Thirdweb cloud authorization errors (401/403 / "not authorized")
    try {
      const msg = String(error?.message || JSON.stringify(error || '')).toLowerCase();
      if (msg.includes('not been authorized') || msg.includes('not authorized') || msg.includes('401') || msg.includes('403') || msg.includes('has not been authorized')) {
        (error as any).thirdwebUnauthorized = true;
      }
    } catch (_) {}

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
    const contract = getContractInstance();
    
    const result = await readContract({
      contract,
      method: "getPoints",
      params: [walletAddress as `0x${string}`],
    });

    return Number(result);
  } catch (error) {
    console.error("Error fetching points from chain:", error);
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
    const contract = getContractInstance();
    console.info('[Triviacast] getLeaderboardFromChain calling', {
      contract: CONTRACT_ADDRESS,
      chainId: CHAIN_ID,
      limit
    });
    const result = await readContract({
      contract,
      method: "getLeaderboard",
      params: [BigInt(limit)],
    });

    const [addresses, points] = result as [string[], bigint[]];
    console.info('[Triviacast] getLeaderboardFromChain result', {
      count: addresses.length,
      sample: addresses.slice(0, 5)
    });
    return addresses.map((address, index) => ({
      walletAddress: address,
      tPoints: Number(points[index]),
    }));
  } catch (error) {
    console.error("Error fetching leaderboard from chain:", error);
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
    const contract = getContractInstance();
    console.info('[Triviacast] getTotalWalletsFromChain calling', {
      contract: CONTRACT_ADDRESS,
      chainId: CHAIN_ID,
    });
    const result = await readContract({
      contract,
      method: "getTotalWallets",
      params: [],
    });
    const total = Number(result);
    console.info('[Triviacast] getTotalWalletsFromChain result', { total });
    return total;
  } catch (error) {
    console.error("Error fetching total wallets from chain:", error);
    return 0;
  }
}
