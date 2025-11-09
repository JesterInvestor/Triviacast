import { readContract, simulateContract, writeContract, watchContractEvent } from '@wagmi/core'
import { wagmiConfig } from './wagmi'

export const JACKPOT_ADDRESS = (process.env.NEXT_PUBLIC_JACKPOT_ADDRESS || '') as `0x${string}`

export const JACKPOT_ABI = [
  {
    type: 'function',
    name: 'buySpins',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'count', type: 'uint256' }],
    outputs: []
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
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }
] as const

export async function approveUsdc(usdc: `0x${string}`, owner: `0x${string}`, amount: bigint) {
  const { request } = await simulateContract(wagmiConfig, {
    address: usdc,
    abi: ERC20_ABI as any,
    functionName: 'approve',
    args: [JACKPOT_ADDRESS, amount],
    account: owner
  })
  return writeContract(wagmiConfig, request)
}

export async function getUsdcAllowance(usdc: `0x${string}`, owner: `0x${string}`) {
  return readContract(wagmiConfig, {
    address: usdc,
    abi: ERC20_ABI as any,
    functionName: 'allowance',
    args: [owner, JACKPOT_ADDRESS]
  }) as Promise<bigint>
}

export async function spinJackpot(owner: `0x${string}`) {
  const { request } = await simulateContract(wagmiConfig, {
    address: JACKPOT_ADDRESS,
    abi: JACKPOT_ABI as any,
    functionName: 'spin',
    args: [],
    account: owner
  })
  return writeContract(wagmiConfig, request)
}

export async function buySpin(owner: `0x${string}`, count: bigint = 1n) {
  const { request } = await simulateContract(wagmiConfig, {
    address: JACKPOT_ADDRESS,
    abi: JACKPOT_ABI as any,
    functionName: 'buySpins',
    args: [count],
    account: owner
  })
  return writeContract(wagmiConfig, request)
}

export async function getSpinCredits(user: `0x${string}`) {
  return readContract(wagmiConfig, {
    address: JACKPOT_ADDRESS,
    abi: JACKPOT_ABI as any,
    functionName: 'spinCredits',
    args: [user]
  }) as Promise<bigint>
}

export async function getLastSpinAt(user: `0x${string}`) {
  return readContract(wagmiConfig, {
    address: JACKPOT_ADDRESS,
    abi: JACKPOT_ABI as any,
    functionName: 'lastSpinAt',
    args: [user]
  }) as Promise<bigint>
}

export function onSpinResult(cb: (args: { requestId: bigint; player: `0x${string}`; prize: bigint }) => void) {
  return watchContractEvent(wagmiConfig, {
    address: JACKPOT_ADDRESS,
    abi: JACKPOT_ABI as any,
    eventName: 'SpinResult',
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
