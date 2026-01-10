import { readContract, simulateContract, writeContract, waitForTransactionReceipt, getAccount } from '@wagmi/core';
import { base, baseSepolia } from 'viem/chains';
import { wagmiConfig } from './wagmi';
import { extendAbiWithErrors } from './contract';
import * as log from './logger';

const SPINWHEEL_ABI = [
  {
    inputs: [],
    name: "spin",
    outputs: [{ internalType: "uint256", name: "requestId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "canUserSpin",
    outputs: [
      { internalType: "bool", name: "canSpin", type: "bool" },
      { internalType: "uint256", name: "timeUntilNext", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "lastSpinAt",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "smallPrize",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "bigPrize",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "spinCooldown",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getExpectedValue",
    outputs: [{ internalType: "uint256", name: "expectedValue", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "when", type: "uint256" }
    ],
    name: "SpinRequested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "uint256", name: "requestId", type: "uint256" },
      { indexed: false, internalType: "uint8", name: "result", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "prize", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "when", type: "uint256" }
    ],
    name: "SpinResult",
    type: "event",
  },
] as const;

const SPINWHEEL_ADDRESS = process.env.NEXT_PUBLIC_SPINWHEEL_ADDRESS;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
const activeChain = CHAIN_ID === 8453 ? base : baseSepolia;

export function isSpinWheelConfigured(): boolean {
  return !!SPINWHEEL_ADDRESS;
}

export function getSpinWheelAddress(): string | undefined {
  return SPINWHEEL_ADDRESS;
}

const SPINWHEEL_ABI_WITH_ERRORS = extendAbiWithErrors(SPINWHEEL_ABI as any);

export interface SpinStatus {
  canSpin: boolean;
  timeUntilNext: bigint;
}

export interface PrizeInfo {
  smallPrize: bigint;
  bigPrize: bigint;
  expectedValue: bigint;
  cooldown: bigint;
}

/**
 * Check if a user can spin the wheel
 */
export async function canUserSpin(userAddress: string): Promise<SpinStatus> {
  if (!isSpinWheelConfigured()) throw new Error("SpinWheel not configured");
  
  try {
    const result = await readContract(wagmiConfig, {
      address: SPINWHEEL_ADDRESS as `0x${string}`,
      abi: SPINWHEEL_ABI_WITH_ERRORS as any,
      functionName: 'canUserSpin',
      args: [userAddress as `0x${string}`],
      chainId: activeChain.id,
    }) as [boolean, bigint];
    
    return {
      canSpin: result[0],
      timeUntilNext: result[1],
    };
  } catch (e) {
    log.error(e, { context: 'canUserSpin', userAddress });
    throw e;
  }
}

/**
 * Get prize information
 */
export async function getPrizeInfo(): Promise<PrizeInfo> {
  if (!isSpinWheelConfigured()) throw new Error("SpinWheel not configured");
  
  try {
    const [smallPrize, bigPrize, expectedValue, cooldown] = await Promise.all([
      readContract(wagmiConfig, {
        address: SPINWHEEL_ADDRESS as `0x${string}`,
        abi: SPINWHEEL_ABI_WITH_ERRORS as any,
        functionName: 'smallPrize',
        chainId: activeChain.id,
      }),
      readContract(wagmiConfig, {
        address: SPINWHEEL_ADDRESS as `0x${string}`,
        abi: SPINWHEEL_ABI_WITH_ERRORS as any,
        functionName: 'bigPrize',
        chainId: activeChain.id,
      }),
      readContract(wagmiConfig, {
        address: SPINWHEEL_ADDRESS as `0x${string}`,
        abi: SPINWHEEL_ABI_WITH_ERRORS as any,
        functionName: 'getExpectedValue',
        chainId: activeChain.id,
      }),
      readContract(wagmiConfig, {
        address: SPINWHEEL_ADDRESS as `0x${string}`,
        abi: SPINWHEEL_ABI_WITH_ERRORS as any,
        functionName: 'spinCooldown',
        chainId: activeChain.id,
      }),
    ]);
    
    return {
      smallPrize: smallPrize as bigint,
      bigPrize: bigPrize as bigint,
      expectedValue: expectedValue as bigint,
      cooldown: cooldown as bigint,
    };
  } catch (e) {
    log.error(e, { context: 'getPrizeInfo' });
    throw e;
  }
}

/**
 * Spin the wheel (initiates VRF request)
 * Returns the transaction hash
 */
export async function spin(): Promise<`0x${string}`> {
  if (!isSpinWheelConfigured()) throw new Error("SpinWheel not configured");
  
  const acc = getAccount(wagmiConfig);
  if (!acc?.address) throw new Error('No active account');
  
  try {
    const { request } = await simulateContract(wagmiConfig, {
      address: SPINWHEEL_ADDRESS as `0x${string}`,
      abi: SPINWHEEL_ABI_WITH_ERRORS as any,
      functionName: 'spin',
      args: [],
      account: acc.address,
      chainId: activeChain.id,
    });
    
    const hash = await writeContract(wagmiConfig, request);
    await waitForTransactionReceipt(wagmiConfig, { hash, chainId: activeChain.id });
    
    log.info({ context: 'spin', hash, user: acc.address });
    return hash;
  } catch (e) {
    log.error(e, { context: 'spin', user: acc.address });
    throw e;
  }
}

/**
 * Get the user's last spin timestamp
 */
export async function getLastSpinAt(userAddress: string): Promise<bigint> {
  if (!isSpinWheelConfigured()) throw new Error("SpinWheel not configured");
  
  try {
    const lastSpin = await readContract(wagmiConfig, {
      address: SPINWHEEL_ADDRESS as `0x${string}`,
      abi: SPINWHEEL_ABI_WITH_ERRORS as any,
      functionName: 'lastSpinAt',
      args: [userAddress as `0x${string}`],
      chainId: activeChain.id,
    });
    
    return lastSpin as bigint;
  } catch (e) {
    log.error(e, { context: 'getLastSpinAt', userAddress });
    throw e;
  }
}

/**
 * Prize types enum matching contract
 */
export enum PrizeType {
  NO_PRIZE = 0,
  SMALL_PRIZE = 1,
  BIG_PRIZE = 2,
}

/**
 * Helper to format time until next spin
 */
export function formatTimeUntilSpin(seconds: bigint): string {
  const secs = Number(seconds);
  if (secs === 0) return "Now";
  
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Helper to format prize amount
 */
export function formatPrize(amount: bigint): string {
  const triv = Number(amount) / 1e18;
  return triv.toLocaleString();
}
