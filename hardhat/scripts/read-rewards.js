#!/usr/bin/env node
const hre = require("hardhat");

async function main() {
  const provider = hre.ethers.provider;
  const stakingAddress = process.env.STAKING_ADDRESS || "0x71D07d8862709115bF242B0478EeadFd74F79Cd5";

  const ABI = [
    "function rewardRate() view returns (uint256)",
    "function lastUpdateTime() view returns (uint256)",
    "function periodFinish() view returns (uint256)"
  ];

  const staking = new hre.ethers.Contract(stakingAddress, ABI, provider);

  const [rewardRate, lastUpdateTime, periodFinish] = await Promise.all([
    staking.rewardRate(),
    staking.lastUpdateTime(),
    staking.periodFinish(),
  ]);

  const now = Math.floor(Date.now() / 1000);

  console.log("Staking contract:", stakingAddress);
  console.log("rewardRate (wei/sec):", rewardRate.toString());
  console.log("lastUpdateTime (unix):", lastUpdateTime.toString(), new Date(Number(lastUpdateTime.toString()) * 1000).toISOString());
  console.log("periodFinish (unix):", periodFinish.toString(), new Date(Number(periodFinish.toString()) * 1000).toISOString());

  const duration = Number(periodFinish.toString()) - Number(lastUpdateTime.toString());
  console.log("configured duration (seconds):", duration);

  const remaining = Number(periodFinish.toString()) - now;
  console.log("remaining seconds:", remaining > 0 ? remaining : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
