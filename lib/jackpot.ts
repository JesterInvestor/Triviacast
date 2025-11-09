import { readContract, simulateContract, writeContract, watchContractEvent, getFeeHistory } from '@wagmi/core'
import { base } from 'wagmi/chains'
import { getAddress } from 'viem'
import { wagmiConfig } from './wagmi'

export const JACKPOT_ADDRESS = (process.env.NEXT_PUBLIC_JACKPOT_ADDRESS || '') as `0x${string}`
const DISABLE_SIMULATE = String(process.env.NEXT_PUBLIC_DISABLE_SIMULATE || '').toLowerCase() === 'true'

// Fee helpers: bump base fees to improve success when estimation is flaky
async function getBumpedFees() {
  try {
    // getFeeHistory is supported by many RPCs; fallback to static bump below if it fails
    const hist = await getFeeHistory(wagmiConfig, { blockCount: 4, rewardPercentiles: [5, 50, 95] }) as any
    const base = BigInt(hist?.baseFeePerGas?.slice(-1)?.[0] ?? 0n)
    const tip = BigInt((hist?.reward?.slice(-1)?.[0]?.[1] || 0))
    const bump = (v: bigint) => ((v * 125n) / 100n) + 1n
    const maxFeePerGas = bump(base > 0n ? base : 1_000_000_000n)
    const maxPriorityFeePerGas = bump(tip > 0n ? tip : 1n)
    return { maxFeePerGas, maxPriorityFeePerGas }
  } catch {
    const bump = (v: bigint) => ((v * 125n) / 100n) + 1n
    const maxFeePerGas = bump(1_000_000_000n)
    const maxPriorityFeePerGas = bump(1n)
    return { maxFeePerGas, maxPriorityFeePerGas }
  }
}

export const JACKPOT_ABI = [
  // Custom errors (for nicer revert decoding)
  { type: 'error', name: 'NotEligible', inputs: [] },
  { type: 'error', name: 'TooSoon', inputs: [] },
  { type: 'error', name: 'PaymentFailed', inputs: [] },
  { type: 'error', name: 'NoSubscription', inputs: [] },
  { type: 'error', name: 'InvalidConfig', inputs: [] },
  {
    type: 'function',
    name: 'buySpins',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'count', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'feeReceiver',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'usdc',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'price',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'lastSpinAt',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'spinCredits',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'spin',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'requestId', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'spinPaying',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: 'requestId', type: 'uint256' }]
  },
  {
    type: 'event',
    name: 'SpinRequested',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: true }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'SpinResult',
    inputs: [
      { name: 'requestId', type: 'uint256', indexed: true },
      { name: 'player', type: 'address', indexed: true },
      { name: 'prize', type: 'uint256', indexed: false }
    ],
    anonymous: false
  }
] as const

export const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] }
] as const

export async function approveUsdc(usdc: `0x${string}`, owner: `0x${string}`, amount: bigint) {
  const usdcAddr = getAddress(usdc)
  const ownerAddr = getAddress(owner)
  if (DISABLE_SIMULATE) {
    return writeContract(wagmiConfig, {
      address: usdcAddr as `0x${string}`,
      abi: ERC20_ABI as any,
      functionName: 'approve',
      args: [getAddress(JACKPOT_ADDRESS) as `0x${string}`, amount],
      account: ownerAddr as `0x${string}`,
      chainId: base.id,
      ...await getBumpedFees()
    })
  }
  const { request } = await simulateContract(wagmiConfig, {
    address: usdcAddr as `0x${string}`,
    abi: ERC20_ABI as any,
    functionName: 'approve',
    args: [getAddress(JACKPOT_ADDRESS) as `0x${string}`, amount],
    account: ownerAddr as `0x${string}`,
    chainId: base.id
  })
  const fees = await getBumpedFees()
  return writeContract(wagmiConfig, {
    address: usdcAddr as `0x${string}`,
    abi: ERC20_ABI as any,
    functionName: 'approve',
    args: [getAddress(JACKPOT_ADDRESS) as `0x${string}`, amount],
    account: ownerAddr as `0x${string}`,
    chainId: base.id,
    ...(request && (request as any).gas ? { gas: (request as any).gas as bigint } : {}),
    ...fees
  } as any)
}

export async function getUsdcAllowance(usdc: `0x${string}`, owner: `0x${string}`) {
  const usdcAddr = getAddress(usdc)
  const ownerAddr = getAddress(owner)
  return readContract(wagmiConfig, {
    address: usdcAddr as `0x${string}`,
    abi: ERC20_ABI as any,
    functionName: 'allowance',
    args: [ownerAddr as `0x${string}`, getAddress(JACKPOT_ADDRESS) as `0x${string}`]
  }) as Promise<bigint>
}

export async function spinJackpot(owner: `0x${string}`) {
  const ownerAddr = getAddress(owner)
  if (DISABLE_SIMULATE) {
    return writeContract(wagmiConfig, {
      address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
      abi: JACKPOT_ABI as any,
      functionName: 'spin',
      args: [],
      account: ownerAddr as `0x${string}`,
      chainId: base.id,
      ...await getBumpedFees()
    })
  }
  const { request } = await simulateContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'spin',
    args: [],
    account: ownerAddr as `0x${string}`,
    chainId: base.id
  })
  const fees = await getBumpedFees()
  return writeContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'spin',
    args: [],
    account: ownerAddr as `0x${string}`,
    chainId: base.id,
    ...(request && (request as any).gas ? { gas: (request as any).gas as bigint } : {}),
    ...fees
  } as any)
}

export async function spinPaying(owner: `0x${string}`) {
  const ownerAddr = getAddress(owner)
  if (DISABLE_SIMULATE) {
    return writeContract(wagmiConfig, {
      address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
      abi: JACKPOT_ABI as any,
      functionName: 'spinPaying',
      args: [],
      account: ownerAddr as `0x${string}`,
      chainId: base.id,
      ...await getBumpedFees()
    })
  }
  const { request } = await simulateContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'spinPaying',
    args: [],
    account: ownerAddr as `0x${string}`,
    chainId: base.id
  })
  const fees = await getBumpedFees()
  return writeContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'spinPaying',
    args: [],
    account: ownerAddr as `0x${string}`,
    chainId: base.id,
    ...(request && (request as any).gas ? { gas: (request as any).gas as bigint } : {}),
    ...fees
  } as any)
}

export async function buySpin(owner: `0x${string}`, count: bigint = 1n) {
  const ownerAddr = getAddress(owner)
  if (DISABLE_SIMULATE) {
    return writeContract(wagmiConfig, {
      address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
      abi: JACKPOT_ABI as any,
      functionName: 'buySpins',
      args: [count],
      account: ownerAddr as `0x${string}`,
      chainId: base.id,
      ...await getBumpedFees()
    })
  }
  const { request } = await simulateContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'buySpins',
    args: [count],
    account: ownerAddr as `0x${string}`,
    chainId: base.id
  })
  const fees = await getBumpedFees()
  return writeContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'buySpins',
    args: [count],
    account: ownerAddr as `0x${string}`,
    chainId: base.id,
    ...(request && (request as any).gas ? { gas: (request as any).gas as bigint } : {}),
    ...fees
  } as any)
}

// Optional: write without simulate to bypass RPC sim quirks in some environments
export async function buySpinNoSim(owner: `0x${string}`, count: bigint = 1n) {
  const ownerAddr = getAddress(owner)
  return writeContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'buySpins',
    args: [count],
    account: ownerAddr as `0x${string}`,
    chainId: base.id,
    ...await getBumpedFees()
  })
}

// Explicit simulate path regardless of the global DISABLE_SIMULATE flag (for users who want a wallet preview)
export async function buySpinWithSim(owner: `0x${string}`, count: bigint = 1n) {
  const ownerAddr = getAddress(owner)
  const { request } = await simulateContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'buySpins',
    args: [count],
    account: ownerAddr as `0x${string}`,
    chainId: base.id
  })
  const fees = await getBumpedFees()
  return writeContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'buySpins',
    args: [count],
    account: ownerAddr as `0x${string}`,
    chainId: base.id,
    ...(request && (request as any).gas ? { gas: (request as any).gas as bigint } : {}),
    ...fees
  } as any)
}

export async function getSpinCredits(user: `0x${string}`) {
  const userAddr = getAddress(user)
  return readContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'spinCredits',
    args: [userAddr as `0x${string}`],
    chainId: base.id
  }) as Promise<bigint>
}

export async function getLastSpinAt(user: `0x${string}`) {
  const userAddr = getAddress(user)
  return readContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'lastSpinAt',
    args: [userAddr as `0x${string}`],
    chainId: base.id
  }) as Promise<bigint>
}

export async function getPrice() {
  return readContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'price',
    args: [],
    chainId: base.id
  }) as Promise<bigint>
}

export async function getFeeReceiver() {
  return readContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'feeReceiver',
    args: [],
    chainId: base.id
  }) as Promise<`0x${string}`>
}

export async function getUsdcToken() {
  return readContract(wagmiConfig, {
    address: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    abi: JACKPOT_ABI as any,
    functionName: 'usdc',
    args: [],
    chainId: base.id
  }) as Promise<`0x${string}`>
}

// Preflight: simulate the USDC transferFrom as if called by the Jackpot contract.
// This checks whether allowance/balance conditions are satisfied at the token level.
export async function simulateUsdcPayment(usdc: `0x${string}`, owner: `0x${string}`, to: `0x${string}`, amount: bigint) {
  // Note: This is an eth_call simulation; it does not change state.
  // account is set to the Jackpot contract address, which is the spender in allowance[from][spender].
  const { result } = await simulateContract(wagmiConfig, {
    address: getAddress(usdc) as `0x${string}`,
    abi: ERC20_ABI as any,
    functionName: 'transferFrom',
    args: [getAddress(owner) as `0x${string}`, getAddress(to) as `0x${string}`, amount],
    account: getAddress(JACKPOT_ADDRESS) as `0x${string}`,
    chainId: base.id,
  }) as unknown as { result: boolean }
  return result
}

export function onSpinResult(cb: (args: { requestId: bigint; player: `0x${string}`; prize: bigint }) => void) {
  return watchContractEvent(wagmiConfig, {
    address: JACKPOT_ADDRESS,
    abi: JACKPOT_ABI as any,
    eventName: 'SpinResult',
    chainId: base.id,
    onLogs: (logs) => {
      for (const log of logs as any[]) {
        const [requestId, player, prize] = log.args as [bigint, `0x${string}`, bigint]
        cb({ requestId, player, prize })
      }
    }
  })
}

export function prizeToLabel(prize: bigint): string {
  if (prize === 0n) return 'Better luck'
  // Assuming TRIV has 18 decimals in contract tiers
  const toUnits = (v: bigint) => Number(v) / 1e18
  switch (prize.toString()) {
    case (10_000_000n * 10n**18n).toString(): return '10,000,000 $TRIV JACKPOT'
    case (10_000n * 10n**18n).toString(): return '10,000 $TRIV'
    case (1_000n * 10n**18n).toString(): return '1,000 $TRIV'
    case (100n * 10n**18n).toString(): return '100 $TRIV'
    default: return `${toUnits(prize).toLocaleString()} $TRIV`
  }
}
