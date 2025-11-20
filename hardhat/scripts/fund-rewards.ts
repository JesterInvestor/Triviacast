import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [caller] = await ethers.getSigners();
  console.log("Running fund-rewards as", caller.address);

  const trivAddress = process.env.TRIV_TOKEN_ADDRESS;
  const stakingAddress = process.env.STAKING_ADDRESS || process.env.NEXT_PUBLIC_STAKING_ADDRESS;

  if (!trivAddress) throw new Error("TRIV_TOKEN_ADDRESS not set in env");
  if (!stakingAddress) throw new Error("STAKING_ADDRESS or NEXT_PUBLIC_STAKING_ADDRESS not set in env");

  const TRIV = await ethers.getContractAt("TRIVToken", trivAddress);
  const STAKING = await ethers.getContractAt("SimpleStaking", stakingAddress);

  // Read reward amount and duration from env, or use defaults
  const reward = process.env.REWARD_AMOUNT || "100000"; // tokens
  const duration = process.env.REWARD_DURATION_SECONDS ? Number(process.env.REWARD_DURATION_SECONDS) : 60 * 60 * 24 * 30; // 30 days

  const rewardUnits = ethers.parseUnits(reward, 18);

  console.log(`Approving ${reward} TRIV (${rewardUnits.toString()}) to ${stakingAddress}`);
  const approveTx = await TRIV.approve(stakingAddress, rewardUnits);
  await approveTx.wait();
  console.log("Approve tx mined", approveTx.hash);

  console.log(`Calling notifyRewardAmount(${rewardUnits.toString()}, ${duration})`);
  const fundTx = await STAKING.notifyRewardAmount(rewardUnits, duration);
  await fundTx.wait();
  console.log("Funded rewards — tx", fundTx.hash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
