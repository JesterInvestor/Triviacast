import { getContract, prepareContractCall, readContract, sendTransaction } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "./thirdweb";
import type { Account } from "thirdweb/wallets";

// Contract ABI - only the functions we need
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

// Get contract address from environment
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");

// Check if contract is configured
export function isContractConfigured(): boolean {
  return !!(CONTRACT_ADDRESS && client);
}

// Get contract instance
function getContractInstance() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }
  if (!client) {
    throw new Error("Thirdweb client not initialized");
  }

  return getContract({
    client,
    address: CONTRACT_ADDRESS,
    chain: baseSepolia,
    abi: CONTRACT_ABI,
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
  
  const transaction = prepareContractCall({
    contract,
    method: "addPoints",
    params: [walletAddress as `0x${string}`, BigInt(points)],
  });

  const result = await sendTransaction({
    transaction,
    account,
  });

  return result;
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
    
    const result = await readContract({
      contract,
      method: "getLeaderboard",
      params: [BigInt(limit)],
    });

    const [addresses, points] = result as [string[], bigint[]];
    
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
    
    const result = await readContract({
      contract,
      method: "getTotalWallets",
      params: [],
    });

    return Number(result);
  } catch (error) {
    console.error("Error fetching total wallets from chain:", error);
    return 0;
  }
}
