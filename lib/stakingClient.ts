// Lightweight ABI fragments and helpers used by the Staking UI
export const TRIV_ABI = [
  // ERC20 minimal
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
];

export const STAKING_ABI = [
  'function stake(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function claimReward()',
  'function earned(address account) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)'
];

export const formatUnits = (value: bigint | number | string, decimals = 18) => {
  // prefer to keep ABI helpers minimal; UI uses ethers utils when available
  return value;
};
