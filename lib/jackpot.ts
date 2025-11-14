import { readContract, simulateContract, writeContract, waitForTransactionReceipt, getAccount } from '@wagmi/core';
import { base, baseSepolia } from 'viem/chains';
import { wagmiConfig } from './wagmi';

const JACKPOT_ABI = [
  {
    inputs: [],
    name: 'spin',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lastPrize',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lastWin',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lastSpinAt',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
  ,
  {
    inputs: [],
    name: 'cooldown',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

const JACKPOT_ADDRESS = process.env.NEXT_PUBLIC_JACKPOT_ADDRESS;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
const activeChain = CHAIN_ID === 8453 ? base : baseSepolia;

export function isJackpotConfigured(): boolean { return !!JACKPOT_ADDRESS; }

export async function callSpin(): Promise<`0x${string}`> {
  if (!isJackpotConfigured()) throw new Error('Jackpot not configured');
  const acc = getAccount(wagmiConfig);
  if (!acc?.address) throw new Error('No active account');

  const { request } = await simulateContract(wagmiConfig, {
    address: JACKPOT_ADDRESS as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'spin',
    args: [],
    account: acc.address,
    chainId: activeChain.id,
  });
  const hash = await writeContract(wagmiConfig, request);
  await waitForTransactionReceipt(wagmiConfig, { hash, chainId: activeChain.id });
  return hash;
}

export async function getLastResult(owner: string): Promise<{ win: boolean; prize: bigint; lastSpinAt: bigint }> {
  if (!isJackpotConfigured()) return { win: false, prize: BigInt(0), lastSpinAt: BigInt(0) };
  try {
    const lastPrize = await readContract(wagmiConfig, {
      address: JACKPOT_ADDRESS as `0x${string}`,
      abi: JACKPOT_ABI as any,
      functionName: 'lastPrize',
      args: [owner as `0x${string}`],
      chainId: activeChain.id,
    });
    const lastWin = await readContract(wagmiConfig, {
      address: JACKPOT_ADDRESS as `0x${string}`,
      abi: JACKPOT_ABI as any,
      functionName: 'lastWin',
      args: [owner as `0x${string}`],
      chainId: activeChain.id,
    });
    const lastSpinAt = await readContract(wagmiConfig, {
      address: JACKPOT_ADDRESS as `0x${string}`,
      abi: JACKPOT_ABI as any,
      functionName: 'lastSpinAt',
      args: [owner as `0x${string}`],
      chainId: activeChain.id,
    });
    return { win: Boolean(lastWin), prize: BigInt(lastPrize as unknown as bigint), lastSpinAt: BigInt(lastSpinAt as unknown as bigint) };
  } catch (e) {
    console.error('getLastResult failed', e);
    return { win: false, prize: BigInt(0), lastSpinAt: BigInt(0) };
  }
}

export async function getCooldown(): Promise<number> {
  if (!isJackpotConfigured()) return 24 * 3600;
  try {
    const cd = await readContract(wagmiConfig, {
      address: JACKPOT_ADDRESS as `0x${string}`,
      abi: JACKPOT_ABI as any,
      functionName: 'cooldown',
      args: [],
      chainId: activeChain.id,
    });
    return Number(cd as unknown as bigint);
  } catch (e) {
    console.error('getCooldown failed', e);
    return 24 * 3600;
  }
}
