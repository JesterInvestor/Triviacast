import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { base } from 'wagmi/chains'
// Simple in-memory read cache to mitigate RPC rate limits on repetitive daily quest reads
const _cache: Map<string, { v: bigint; t: number }> = new Map()
const TTL_MS = 15_000 // 15s is enough; values only change after a claim or mark action
import { wagmiConfig } from '@/lib/wagmi'

export const IQPOINTS_ADDRESS = process.env.NEXT_PUBLIC_IQPOINTS_ADDRESS as `0x${string}` | undefined
export const QUEST_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_QUEST_MANAGER_ADDRESS as `0x${string}` | undefined

export const IQPOINTS_ABI = [
  { name: 'getPoints', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] }
] as const

export const QUEST_MANAGER_ABI = [
  { name: 'lastClaimDay', type: 'function', stateMutability: 'view', inputs: [{ name:'user', type:'address' }, { name:'id', type:'uint8' }], outputs: [{ type:'uint256' }] },
  { name: 'quizPlayedDay', type: 'function', stateMutability: 'view', inputs: [{ name:'user', type:'address' }], outputs: [{ type:'uint256' }] },
  { name: 'friendSearchedDay', type: 'function', stateMutability: 'view', inputs: [{ name:'user', type:'address' }], outputs: [{ type:'uint256' }] },
  { name: 'claimShare', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'claimDailyQuizPlay', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'claimDailyChallenge', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'claimFollowJester', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'claimDailyOneIQ', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'markQuizPlayedForToday', type: 'function', stateMutability: 'nonpayable', inputs: [{ name:'user', type:'address' }], outputs: [] },
  { name: 'markFriendSearchedForToday', type: 'function', stateMutability: 'nonpayable', inputs: [{ name:'user', type:'address' }], outputs: [] },
] as const

export async function getIQPoints(user: `0x${string}`) {
  if (!IQPOINTS_ADDRESS) throw new Error('IQPoints address not set')
  return readContract(wagmiConfig, {
    address: IQPOINTS_ADDRESS,
    abi: IQPOINTS_ABI as any,
    functionName: 'getPoints',
    args: [user],
    chainId: base.id
  }) as Promise<bigint>
}

export async function getLastClaimDay(user: `0x${string}`, questId: number) {
  if (!QUEST_MANAGER_ADDRESS) throw new Error('QuestManager address not set')
  const key = `lcd:${QUEST_MANAGER_ADDRESS}:${user}:${questId}`
  const now = Date.now()
  const hit = _cache.get(key)
  if (hit && (now - hit.t) < TTL_MS) return hit.v
  const v = await readContract(wagmiConfig, {
    address: QUEST_MANAGER_ADDRESS,
    abi: QUEST_MANAGER_ABI as any,
    functionName: 'lastClaimDay',
    args: [user, questId],
    chainId: base.id
  }) as Promise<bigint>
  _cache.set(key, { v: await v, t: now })
  return v
}

export async function getQuizPlayedDay(user: `0x${string}`) {
  if (!QUEST_MANAGER_ADDRESS) throw new Error('QuestManager address not set')
  const key = `qpd:${QUEST_MANAGER_ADDRESS}:${user}`
  const now = Date.now()
  const hit = _cache.get(key)
  if (hit && (now - hit.t) < TTL_MS) return hit.v
  const v = await readContract(wagmiConfig, {
    address: QUEST_MANAGER_ADDRESS,
    abi: QUEST_MANAGER_ABI as any,
    functionName: 'quizPlayedDay',
    args: [user],
    chainId: base.id
  }) as Promise<bigint>
  _cache.set(key, { v: await v, t: now })
  return v
}

export async function getFriendSearchedDay(user: `0x${string}`) {
  if (!QUEST_MANAGER_ADDRESS) throw new Error('QuestManager address not set')
  const key = `fsd:${QUEST_MANAGER_ADDRESS}:${user}`
  const now = Date.now()
  const hit = _cache.get(key)
  if (hit && (now - hit.t) < TTL_MS) return hit.v
  const v = await readContract(wagmiConfig, {
    address: QUEST_MANAGER_ADDRESS,
    abi: QUEST_MANAGER_ABI as any,
    functionName: 'friendSearchedDay',
    args: [user],
    chainId: base.id
  }) as Promise<bigint>
  _cache.set(key, { v: await v, t: now })
  return v
}

export async function markQuizPlayedForToday(user: `0x${string}`) {
  if (!QUEST_MANAGER_ADDRESS) throw new Error('QuestManager address not set')
  const hash = await writeContract(wagmiConfig, {
    address: QUEST_MANAGER_ADDRESS,
    abi: QUEST_MANAGER_ABI as any,
    functionName: 'markQuizPlayedForToday',
    args: [user],
    chainId: base.id
  })
  try { await waitForTransactionReceipt(wagmiConfig, { hash }) } catch {}
  // Invalidate cache entries related to this user
  _cache.delete(`qpd:${QUEST_MANAGER_ADDRESS}:${user}`)
  return hash
}

export async function markFriendSearchedForToday(user: `0x${string}`) {
  if (!QUEST_MANAGER_ADDRESS) throw new Error('QuestManager address not set')
  const hash = await writeContract(wagmiConfig, {
    address: QUEST_MANAGER_ADDRESS,
    abi: QUEST_MANAGER_ABI as any,
    functionName: 'markFriendSearchedForToday',
    args: [user],
    chainId: base.id
  })
  try { await waitForTransactionReceipt(wagmiConfig, { hash }) } catch {}
  _cache.delete(`fsd:${QUEST_MANAGER_ADDRESS}:${user}`)
  return hash
}

async function writeQuest(functionName: 'claimShare' | 'claimDailyQuizPlay' | 'claimDailyChallenge' | 'claimFollowJester' | 'claimDailyOneIQ') {
  if (!QUEST_MANAGER_ADDRESS) throw new Error('QuestManager address not set')
  const hash = await writeContract(wagmiConfig, {
    address: QUEST_MANAGER_ADDRESS,
    abi: QUEST_MANAGER_ABI as any,
    functionName,
    args: [],
    chainId: base.id
  })
  try {
    await waitForTransactionReceipt(wagmiConfig, { hash })
  } catch {}
  // Invalidate lastClaimDay for this quest for any consumer refreshing soon
  // (Exact user not known here; caller updates local state)
  return hash
}

export const claimShare = () => writeQuest('claimShare')
export const claimDailyQuizPlay = () => writeQuest('claimDailyQuizPlay')
export const claimDailyChallenge = () => writeQuest('claimDailyChallenge')
export const claimFollowJester = () => writeQuest('claimFollowJester')
export const claimDailyOneIQ = () => writeQuest('claimDailyOneIQ')
