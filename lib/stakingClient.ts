import { readContract, writeContract } from 'wagmi/actions';
import { wagmiConfig } from './wagmi';
import TRIVStakingAbi from '../contracts/abi/TRIVStaking.json';
import TRIVRewardsAbi from '../contracts/abi/TRIVRewards.json';
import type { TRIVStaking, TRIVRewards } from '../contracts/types';

// Use deployed contract addresses from environment variables
const stakingAddr = process.env.NEXT_PUBLIC_TRIV_STAKING_ADDRESS || process.env.TRIV_STAKING_ADDRESS;
const rewardsAddr = process.env.NEXT_PUBLIC_TRIV_REWARDS_ADDRESS || process.env.TRIV_REWARDS_ADDRESS;
if (!stakingAddr || !stakingAddr.startsWith('0x') || stakingAddr.length !== 42) throw new Error('TRIV_STAKING_ADDRESS missing or invalid');
if (!rewardsAddr || !rewardsAddr.startsWith('0x') || rewardsAddr.length !== 42) throw new Error('TRIV_REWARDS_ADDRESS missing or invalid');
export const TRIV_STAKING_ADDRESS = stakingAddr as `0x${string}`;
export const TRIV_REWARDS_ADDRESS = rewardsAddr as `0x${string}`;

export const stakingContract = {
  address: TRIV_STAKING_ADDRESS,
  abi: TRIVStakingAbi,
} as const;

export const rewardsContract = {
  address: TRIV_REWARDS_ADDRESS,
  abi: TRIVRewardsAbi,
} as const;

// Example: get a user's staked amount
export async function getUserStakedAmount(user: string) {
  return await readContract(
    wagmiConfig,
    {
      ...stakingContract,
      functionName: 'stakedAmount',
      args: [user],
    }
  ) as bigint;
}

// Example: get claimable rewards for a user
export async function getUserClaimable(user: string) {
  return await readContract(
    wagmiConfig,
    {
      ...rewardsContract,
      functionName: 'claimable',
      args: [user],
    }
  ) as bigint;
}

// Example: stake tokens
export async function stake(amount: bigint) {
  return await writeContract(
    wagmiConfig,
    {
      ...stakingContract,
      functionName: 'stake',
      args: [amount],
    }
  );
}

// Example: unstake tokens
export async function unstake(amount: bigint) {
  return await writeContract(
    wagmiConfig,
    {
      ...stakingContract,
      functionName: 'unstake',
      args: [amount],
    }
  );
}

// Example: claim rewards
export async function claimRewards() {
  return await writeContract(
    wagmiConfig,
    {
      ...rewardsContract,
      functionName: 'claim',
      args: [],
    }
  );
}
