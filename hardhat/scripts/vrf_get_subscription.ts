import { ethers } from "hardhat";

// Prints VRF v2.5 subscription details
// Usage:
//   npx hardhat run scripts/vrf_get_subscription.ts --network base
// Env required:
//   VRF_COORDINATOR
//   VRF_SUBSCRIPTION_ID

const COORDINATOR_ABI = [
  "function getSubscription(uint256 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] consumers)"
];

async function main() {
  const { VRF_COORDINATOR, VRF_SUBSCRIPTION_ID } = process.env as Record<string,string>;
  if (!VRF_COORDINATOR) throw new Error("VRF_COORDINATOR not set");
  if (!VRF_SUBSCRIPTION_ID) throw new Error("VRF_SUBSCRIPTION_ID not set");
  const subId = BigInt(VRF_SUBSCRIPTION_ID);

  const provider = ethers.provider;
  const coord = new ethers.Contract(VRF_COORDINATOR, COORDINATOR_ABI, provider);
  const sub = await coord.getSubscription(subId);
  const balance: bigint = sub[0];
  const reqCount: bigint = sub[1];
  const owner: string = sub[2];
  const consumers: string[] = sub[3];
  console.log(JSON.stringify({ subId: subId.toString(), balance: balance.toString(), reqCount: reqCount.toString(), owner, consumers }, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
