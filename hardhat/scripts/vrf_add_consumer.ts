import { ethers } from "hardhat";

// Usage:
//   npx hardhat run scripts/vrf_add_consumer.ts --network base --consumer 0xYourJackpot
// Requires env:
//   VRF_COORDINATOR (v2.5 coordinator)
//   VRF_SUBSCRIPTION_ID (uint256)

const COORDINATOR_ABI = [
  "function addConsumer(uint256 subId, address consumer) external",
  "function getSubscription(uint256 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] consumers)"
];

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return undefined;
}

async function main() {
  const { VRF_COORDINATOR, VRF_SUBSCRIPTION_ID } = process.env as Record<string, string>;
  const consumer = getArg("--consumer") || process.env.CONSUMER;
  if (!VRF_COORDINATOR) throw new Error("VRF_COORDINATOR not set");
  if (!VRF_SUBSCRIPTION_ID) throw new Error("VRF_SUBSCRIPTION_ID not set");
  if (!consumer) throw new Error("Provide --consumer 0xAddress or set CONSUMER env var");

  const subId = BigInt(VRF_SUBSCRIPTION_ID);
  const coord = new ethers.Contract(VRF_COORDINATOR, COORDINATOR_ABI, (await ethers.getSigners())[0]);

  console.log("Adding consumer", consumer, "to subscription", subId.toString(), "on coordinator", VRF_COORDINATOR);
  const tx = await coord.addConsumer(subId, consumer);
  console.log("tx:", tx.hash);
  await tx.wait();
  console.log("Done. Verifying consumer is present...");
  const sub = await coord.getSubscription(subId);
  const consumers: string[] = sub[3];
  const found = consumers.map((c) => c.toLowerCase()).includes(consumer.toLowerCase());
  console.log("Consumers:", consumers);
  if (!found) throw new Error("Consumer not found after addConsumer; check permissions / owner");
  console.log("Success: consumer added.");
}

main().catch((e) => { console.error(e); process.exit(1); });
