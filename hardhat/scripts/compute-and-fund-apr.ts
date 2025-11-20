import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [caller] = await ethers.getSigners();
  console.log("Running compute-and-fund-apr as", caller.address);

  const trivAddress = process.env.TRIV_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_TRIV_ADDRESS;
  const stakingAddress = process.env.STAKING_ADDRESS || process.env.NEXT_PUBLIC_STAKING_ADDRESS || "0x71D07d8862709115bF242B0478EeadFd74F79Cd5";

  if (!trivAddress) throw new Error("TRIV_TOKEN_ADDRESS not set in env");
  if (!stakingAddress) throw new Error("STAKING_ADDRESS not set in env");

  const APR_PERCENT = process.env.REWARD_APR_PERCENT ? Number(process.env.REWARD_APR_PERCENT) : 80; // default 80%
  if (!Number.isFinite(APR_PERCENT) || APR_PERCENT <= 0) throw new Error("REWARD_APR_PERCENT must be a positive number");

  const TRIV = await ethers.getContractAt("TRIVToken", trivAddress);
  const STAKING = await ethers.getContractAt("SimpleStaking", stakingAddress);

  // read current total supply (total staked)
  const totalSupply = await STAKING.totalSupply();
  console.log("totalSupply (wei):", totalSupply.toString());
  const totalSupplyFormatted = ethers.formatUnits(totalSupply, 18);
  console.log("totalSupply (TRIV):", totalSupplyFormatted);

  // compute daily reward for APR_PERCENT: daily = totalSupply * APR_PERCENT / 100 / 365
  const totalWei = BigInt(totalSupply.toString());
  const aprPercent = BigInt(Math.round(APR_PERCENT));
  const dailyWei = (totalWei * aprPercent) / BigInt(100) / BigInt(365);

  if (dailyWei === BigInt(0)) {
    console.log("Computed daily reward is 0 (total supply too small). Aborting.");
    return;
  }

  const dailyFormatted = ethers.formatUnits(dailyWei.toString(), 18);
  console.log(`Computed daily reward for ${APR_PERCENT}% APR: ${dailyFormatted} TRIV (${dailyWei.toString()} wei)`);

  // duration = 24 hours
  const duration = 60 * 60 * 24;

  console.log(`Approving ${dailyFormatted} TRIV to staking contract (${stakingAddress})`);
  const approveTx = await TRIV.approve(stakingAddress, dailyWei.toString());
  await approveTx.wait();
  console.log("Approve tx mined", approveTx.hash);

  console.log(`Calling notifyRewardAmount(${dailyWei.toString()}, ${duration})`);
  const fundTx = await STAKING.notifyRewardAmount(dailyWei.toString(), duration);
  await fundTx.wait();
  console.log("Funded rewards — tx", fundTx.hash);

  // compute rewardRate (wei/sec)
  const rewardRate = BigInt(dailyWei.toString()) / BigInt(duration);
  console.log("rewardRate (wei/sec):", rewardRate.toString());
  console.log("rewardRate (TRIV/sec):", ethers.formatUnits(rewardRate.toString(), 18));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
