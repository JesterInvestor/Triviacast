import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { wagmiConfig } from '@/lib/wagmi'

export const IQPOINTS_ADDRESS = process.env.NEXT_PUBLIC_IQPOINTS_ADDRESS as `0x${string}` | undefined
export const QUEST_MANAGER_ADDRESS = process.env.NEXT_PUBLIC_QUEST_MANAGER_ADDRESS as `0x${string}` | undefined

export const IQPOINTS_ABI = [
  { name: 'getPoints', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] }
] as const

export const QUEST_MANAGER_ABI = [
  { name: 'lastClaimDay', type: 'function', stateMutability: 'view', inputs: [{ name:'user', type:'address' }, { name:'id', type:'uint8' }], outputs: [{ type:'uint256' }] },
  { name: 'claimShare', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'claimDailyQuizPlay', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'claimDailyChallenge', type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
] as const

export async function getIQPoints(user: `0x${string}`) {
  if (!IQPOINTS_ADDRESS) throw new Error('IQPoints address not set')
  return readContract(wagmiConfig, {
    address: IQPOINTS_ADDRESS,
    abi: IQPOINTS_ABI as any,
    functionName: 'getPoints',
    args: [user]
  }) as Promise<bigint>
}

export async function getLastClaimDay(user: `0x${string}`, questId: number) {
  if (!QUEST_MANAGER_ADDRESS) throw new Error('QuestManager address not set')
  return readContract(wagmiConfig, {
    address: QUEST_MANAGER_ADDRESS,
    abi: QUEST_MANAGER_ABI as any,
    functionName: 'lastClaimDay',
    args: [user, questId]
  }) as Promise<bigint>
}

async function writeQuest(functionName: 'claimShare' | 'claimDailyQuizPlay' | 'claimDailyChallenge') {
  if (!QUEST_MANAGER_ADDRESS) throw new Error('QuestManager address not set')
  const hash = await writeContract(wagmiConfig, {
    address: QUEST_MANAGER_ADDRESS,
    abi: QUEST_MANAGER_ABI as any,
    functionName,
    args: []
  })
  try {
    await waitForTransactionReceipt(wagmiConfig, { hash })
  } catch {}
  return hash
}

export const claimShare = () => writeQuest('claimShare')
export const claimDailyQuizPlay = () => writeQuest('claimDailyQuizPlay')
export const claimDailyChallenge = () => writeQuest('claimDailyChallenge')
