import { ethers } from "ethers";

const TRIV_ADDRESS = process.env.NEXT_PUBLIC_TRIV_ADDRESS as string | undefined;
const RPC_URL = (process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL) as string | undefined;
const PRIVATE_KEY = process.env.DISTRIBUTOR_ADMIN_PRIVATE_KEY as string | undefined;

if (!TRIV_ADDRESS) {
  console.warn("lib/payout: NEXT_PUBLIC_TRIV_ADDRESS is not set");
}

export async function sendTriv(to: string, amountTokens: number) {
  if (!RPC_URL) throw new Error("RPC_URL (or NEXT_PUBLIC_RPC_URL) is not configured on server");
  if (!PRIVATE_KEY) throw new Error("DISTRIBUTOR_ADMIN_PRIVATE_KEY not configured");
  if (!TRIV_ADDRESS) throw new Error("TRIV token address not configured");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider) as any;

  const ERC20_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
  const token = new ethers.Contract(TRIV_ADDRESS, ERC20_ABI, wallet) as any;

  const amount = ethers.parseUnits(String(amountTokens), 18);
  const tx = await token.transfer(to, amount);
  // wait for 1 confirmation
  await tx.wait?.(1).catch(() => {});
  return tx.hash;
}
