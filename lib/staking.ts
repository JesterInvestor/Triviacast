import { readContract, simulateContract, writeContract, waitForTransactionReceipt, getAccount } from '@wagmi/core';
import { base, baseSepolia } from 'viem/chains';
import { wagmiConfig } from './wagmi';

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
  ,
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const;

const STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_ADDRESS;
const TRIV_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TRIV_ADDRESS;
const TRIV_DECIMALS = parseInt(process.env.NEXT_PUBLIC_TRIV_DECIMALS || '18', 10);
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
const activeChain = CHAIN_ID === 8453 ? base : baseSepolia;

export function isStakingConfigured(): boolean {
  return !!STAKING_ADDRESS;
}

export function isTokenConfigured(): boolean {
  return !!TRIV_TOKEN_ADDRESS;
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

// No contract factory needed; we call viem/wagmi directly each time.

// Basic ERC20 helpers (approve / allowance)
const ERC20_ABI = [
  { inputs: [{ internalType: 'address', name: 'owner', type: 'address' }, { internalType: 'address', name: 'spender', type: 'address' }], name: 'allowance', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ internalType: 'address', name: 'spender', type: 'address' }, { internalType: 'uint256', name: 'amount', type: 'uint256' }], name: 'approve', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'nonpayable', type: 'function' }
] as const;

function getTokenAddress(tokenAddress?: string) {
  return tokenAddress || TRIV_TOKEN_ADDRESS;
}

export async function getAllowance(owner: string, spender: string, tokenAddress?: string): Promise<bigint> {
  const addr = getTokenAddress(tokenAddress);
  if (!addr) return BigInt(0);
  try {
    const result = await readContract(wagmiConfig, {
      address: addr as `0x${string}`,
      abi: ERC20_ABI as any,
      functionName: 'allowance',
      args: [owner as `0x${string}`, spender as `0x${string}`],
      chainId: activeChain.id,
    });
    return BigInt(result as unknown as bigint);
  } catch (e) {
    console.error('allowance read failed', e);
    return BigInt(0);
  }
}

export async function approveToken(spender: string, amount: bigint, tokenAddress?: string): Promise<`0x${string}`> {
  const addr = getTokenAddress(tokenAddress);
  if (!addr) throw new Error('Token not configured');
  const acc = getAccount(wagmiConfig);
  if (!acc?.address) throw new Error('No active account');
  const { request } = await simulateContract(wagmiConfig, {
    address: addr as `0x${string}`,
    abi: ERC20_ABI as any,
    functionName: 'approve',
    args: [spender as `0x${string}`, amount],
    account: acc.address,
    chainId: activeChain.id,
  });
  const hash = await writeContract(wagmiConfig, request);
  await waitForTransactionReceipt(wagmiConfig, { hash, chainId: activeChain.id });
  return hash;
}

export async function callStake(amount: bigint | number): Promise<`0x${string}`> {
  if (!isStakingConfigured()) throw new Error("Staking not configured");
  const acc = getAccount(wagmiConfig);
  if (!acc?.address) throw new Error('No active account');

  // Approval flow
  if (isTokenConfigured() && TRIV_TOKEN_ADDRESS) {
    try {
      const owner = acc.address as string;
      const spender = STAKING_ADDRESS as string;
      const needed = typeof amount === 'bigint' ? amount : BigInt(amount);
      const allowance = await getAllowance(owner, spender, TRIV_TOKEN_ADDRESS);
      if (allowance < needed) {
        const MAX_UINT256 = (BigInt(2) ** BigInt(256)) - BigInt(1);
        await approveToken(spender, MAX_UINT256, TRIV_TOKEN_ADDRESS);
      }
    } catch (e) {
      console.warn('Approval flow failed or skipped', e);
    }
  }

  const { request } = await simulateContract(wagmiConfig, {
    address: STAKING_ADDRESS as `0x${string}`,
    abi: STAKING_ABI as any,
    functionName: 'stake',
    args: [BigInt(amount)],
    account: acc.address,
    chainId: activeChain.id,
  });
  const hash = await writeContract(wagmiConfig, request);
  await waitForTransactionReceipt(wagmiConfig, { hash, chainId: activeChain.id });
  return hash;
}

export async function getStakedBalance(owner: string): Promise<bigint> {
  if (!isStakingConfigured()) return BigInt(0);
  try {
    const result = await readContract(wagmiConfig, {
      address: STAKING_ADDRESS as `0x${string}`,
      abi: STAKING_ABI as any,
      functionName: 'balanceOf',
      args: [owner as `0x${string}`],
      chainId: activeChain.id,
    });
    return BigInt(result as unknown as bigint);
  } catch (e) {
    console.error('getStakedBalance failed', e);
    return BigInt(0);
  }
}
