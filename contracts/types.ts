// Auto-generated contract types for TRIVStaking and TRIVRewards
// You can use these with wagmi/viem/ethers for type-safe contract calls

export type TRIVStaking = {
  stake: (amount: bigint) => Promise<void>;
  stakeFor: (user: string, amount: bigint) => Promise<void>;
  unstake: (amount: bigint) => Promise<void>;
  stakedAmount: (user: string) => Promise<bigint>;
  totalStakedAmount: () => Promise<bigint>;
  isStakingPaused: () => Promise<boolean>;
  addRewarder: (rewarder: string) => Promise<void>;
  removeRewarder: (rewarder: string) => Promise<void>;
  isRewarder: (rewarder: string) => Promise<boolean>;
  owner: () => Promise<string>;
  proposedOwner: () => Promise<string>;
  setProposedOwner: (proposed: string) => Promise<void>;
  setStakingPaused: (paused: boolean) => Promise<void>;
  stakingToken: () => Promise<string>;
};

export type TRIVRewards = {
  addReward: (amount: bigint) => Promise<void>;
  claim: () => Promise<void>;
  batchClaim: (users: string[]) => Promise<void>;
  claimable: (user?: string) => Promise<bigint>;
  isRewardingPaused: () => Promise<boolean>;
  owner: () => Promise<string>;
  proposedOwner: () => Promise<string>;
  setProposedOwner: (proposed: string) => Promise<void>;
  setRewardingPaused: (paused: boolean) => Promise<void>;
  rewardToken: () => Promise<string>;
  rewardAccumulatedPerStakedToken: () => Promise<bigint>;
  stakingContract: () => Promise<string>;
  totalRewardsClaimable: () => Promise<bigint>;
  totalRewardsClaimed: () => Promise<bigint>;
};
