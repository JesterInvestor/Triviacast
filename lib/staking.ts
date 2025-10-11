import { getContract, prepareContractCall, readContract, sendTransaction } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";
import { client } from "./thirdweb";
import type { Account } from "thirdweb/wallets";

const STAKING_ABI = [
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "stake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  }
] as const;

const STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_ADDRESS;
const TRIV_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TRIV_ADDRESS;
const TRIV_DECIMALS = parseInt(process.env.NEXT_PUBLIC_TRIV_DECIMALS || '18', 10);
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
const activeChain = CHAIN_ID === 8453 ? base : baseSepolia;

export function isStakingConfigured(): boolean {
  return !!(STAKING_ADDRESS && client);
}

export function isTokenConfigured(): boolean {
  return !!(TRIV_TOKEN_ADDRESS && client);
}

/**
 * Parse a decimal token amount (string) into atomic BigInt using configured decimals
 * e.g. '1.5' with 18 decimals -> BigInt(1500000000000000000)
 */
export function parseTokenAmount(amount: string | number): bigint {
  const decimals = isNaN(TRIV_DECIMALS) ? 18 : TRIV_DECIMALS;
  const str = typeof amount === 'number' ? String(amount) : amount;
  const [whole, fraction] = (str || '').split('.');
  const wholeBN = BigInt(whole || '0');
  const fracStr = (fraction || '').slice(0, decimals).padEnd(decimals, '0');
  const fracBN = BigInt(fracStr || '0');
  const factor = BigInt(10) ** BigInt(decimals);
  return wholeBN * factor + fracBN;
}

function getStakingContract() {
  if (!STAKING_ADDRESS) throw new Error("Staking address not configured");
  if (!client) throw new Error("Thirdweb client not initialized");
  return getContract({ client, address: STAKING_ADDRESS, chain: activeChain, abi: STAKING_ABI });
}

// Basic ERC20 helpers (approve / allowance)
const ERC20_ABI = [
  { inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' }
] as const;

function getTokenContract(tokenAddress?: string) {
  const addr = tokenAddress || TRIV_TOKEN_ADDRESS;
  if (!addr) throw new Error('Token address not configured');
  if (!client) throw new Error('Thirdweb client not initialized');
  return getContract({ client, address: addr, chain: activeChain, abi: ERC20_ABI });
}

export async function getAllowance(owner: string, spender: string, tokenAddress?: string): Promise<bigint> {
  if (!tokenAddress && !TRIV_TOKEN_ADDRESS) return BigInt(0);
  const contract = getTokenContract(tokenAddress);
  const result = await readContract({ contract, method: 'allowance', params: [owner as `0x${string}`, spender as `0x${string}`] });
  return BigInt(result as any as bigint);
}

export async function approveToken(account: Account, spender: string, amount: bigint, tokenAddress?: string): Promise<any> {
  if (!tokenAddress && !TRIV_TOKEN_ADDRESS) throw new Error('Token not configured');
  const contract = getTokenContract(tokenAddress);
  const tx = prepareContractCall({ contract, method: 'approve', params: [spender as `0x${string}`, amount] });
  return await sendTransaction({ transaction: tx, account });
}

export async function callStake(account: Account, amount: bigint | number): Promise<any> {
  if (!isStakingConfigured()) throw new Error("Staking not configured");
  const contract = getStakingContract();

  // If a TRIV token is configured, ensure approval exists for the staking contract
  if (isTokenConfigured() && TRIV_TOKEN_ADDRESS) {
    try {
      const owner = (account as any).address as string;
      const spender = STAKING_ADDRESS as string;
      const needed = typeof amount === 'bigint' ? amount : BigInt(amount);
      const allowance = await getAllowance(owner, spender, TRIV_TOKEN_ADDRESS);
      if (allowance < needed) {
        // request approval
        await approveToken(account, spender, needed, TRIV_TOKEN_ADDRESS);
      }
    } catch (e) {
      // Let the stake call proceed; if approval failed, contract call may still fail.
      console.warn('Approval flow failed or skipped', e);
    }
  }

  const tx = prepareContractCall({ contract, method: "stake", params: [BigInt(amount)] });
  return await sendTransaction({ transaction: tx, account });
}
