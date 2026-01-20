/**
 * IQ Point Reward Configuration
 * Define various ways users can earn iQ points
 */

export interface IQReward {
  id: string;
  name: string;
  description: string;
  points: number;
  category: 'quest' | 'achievement' | 'social' | 'milestone' | 'bonus';
  enabled: boolean;
}

export const IQ_REWARDS: IQReward[] = [
  // TODO: Add reward details
  {
    id: 'iq_reward_1',
    name: 'TBD',
    description: 'Description to be added',
    points: 0,
    category: 'quest',
    enabled: false,
  },
  
  // TODO: Add reward details
  {
    id: 'iq_reward_2',
    name: 'TBD',
    description: 'Description to be added',
    points: 0,
    category: 'achievement',
    enabled: false,
  },
  
  // TODO: Add reward details
  {
    id: 'iq_reward_3',
    name: 'TBD',
    description: 'Description to be added',
    points: 0,
    category: 'social',
    enabled: false,
  },
  
  // TODO: Add reward details
  {
    id: 'iq_reward_4',
    name: 'TBD',
    description: 'Description to be added',
    points: 0,
    category: 'milestone',
    enabled: false,
  },
  
  // TODO: Add reward details (bonus entry)
  {
    id: 'iq_reward_5',
    name: 'TBD',
    description: 'Description to be added',
    points: 0,
    category: 'bonus',
    enabled: false,
  },
];

export function getIQReward(id: string): IQReward | undefined {
  return IQ_REWARDS.find(reward => reward.id === id);
}

export function getActiveIQRewards(): IQReward[] {
  return IQ_REWARDS.filter(reward => reward.enabled);
}

export function getIQRewardsByCategory(category: IQReward['category']): IQReward[] {
  return IQ_REWARDS.filter(reward => reward.category === category);
}
