import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [caller] = await ethers.getSigners();
  console.log("Running notify-reward-manual as", caller.address);

  const stakingAddress = process.env.STAKING_ADDRESS || process.env.NEXT_PUBLIC_STAKING_ADDRESS || "0x71D07d8862709115bF242B0478EeadFd74F79Cd5";
  const rewardWei = process.env.NOTIFY_REWARD_WEI;
  const duration = process.env.NOTIFY_DURATION ? Number(process.env.NOTIFY_DURATION) : 86400;

  if (!rewardWei) throw new Error("NOTIFY_REWARD_WEI must be set in env (wei string)");

  const STAKING = await ethers.getContractAt("SimpleStaking", stakingAddress);

  const nonce = await caller.getNonce();
  console.log("Using nonce:", nonce.toString());

  const tx = await STAKING.notifyRewardAmount(rewardWei, duration, { nonce: nonce });
  console.log("Sent tx", tx.hash);
  await tx.wait();
  console.log("notifyRewardAmount mined", tx.hash);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
