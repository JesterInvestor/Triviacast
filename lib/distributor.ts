import { getContract, prepareContractCall, readContract, sendTransaction } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";
import { client } from "./thirdweb";
import type { Account } from "thirdweb/wallets";

const DISTRIBUTOR_ABI = [
  {
    inputs: [],
    name: "dailyClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "airdropTop5",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const DISTRIBUTOR_ADDRESS = process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
const activeChain = CHAIN_ID === 8453 ? base : baseSepolia;

export function isDistributorConfigured(): boolean {
  return !!(DISTRIBUTOR_ADDRESS && client);
}

function getDistributorContract() {
  if (!DISTRIBUTOR_ADDRESS) throw new Error("Distributor address not configured");
  if (!client) throw new Error("Thirdweb client not initialized");
  return getContract({ client, address: DISTRIBUTOR_ADDRESS, chain: activeChain, abi: DISTRIBUTOR_ABI });
}

export async function getDistributorOwner(): Promise<string | null> {
  if (!isDistributorConfigured()) return null;
  try {
    const contract = getDistributorContract();
    const owner = await readContract({ contract, method: "owner", params: [] });
    return owner as string;
  } catch (e) {
    console.error("getDistributorOwner error", e);
    return null;
  }
}

export async function callDailyClaim(account: Account): Promise<any> {
  if (!isDistributorConfigured()) throw new Error("Distributor not configured");
  const contract = getDistributorContract();
  const tx = prepareContractCall({ contract, method: "dailyClaim", params: [] });
  return await sendTransaction({ transaction: tx, account });
}

export async function callAirdropTop5(account: Account): Promise<any> {
  if (!isDistributorConfigured()) throw new Error("Distributor not configured");
  const contract = getDistributorContract();
  const tx = prepareContractCall({ contract, method: "airdropTop5", params: [] });
  return await sendTransaction({ transaction: tx, account });
}
