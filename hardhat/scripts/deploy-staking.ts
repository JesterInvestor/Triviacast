import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with", deployer.address);

  const TRIV = await ethers.getContractFactory("TRIVToken");
  const triv = await TRIV.deploy();
  await triv.deployed();
  console.log("TRIV deployed to:", triv.target || triv.address);

  // Mint some tokens to deployer for testing
  const mintAmount = ethers.parseUnits("1000000", 18);
  const tx = await triv.mint(deployer.address, mintAmount);
  await tx.wait();
  console.log("Minted", mintAmount.toString(), "TRIV to deployer");

  const Staking = await ethers.getContractFactory("SimpleStaking");
  const staking = await Staking.deploy(triv.target || triv.address, triv.target || triv.address);
  await staking.deployed();
  console.log("Staking deployed to:", staking.target || staking.address);

  // Approve and fund rewards (example: 100k TRIV over 30 days)
  const rewardAmount = ethers.parseUnits("100000", 18);
  await triv.approve(staking.target || staking.address, rewardAmount);
  const duration = 60 * 60 * 24 * 30; // 30 days
  const fundTx = await staking.notifyRewardAmount(rewardAmount, duration);
  await fundTx.wait();
  console.log("Funded rewards:", rewardAmount.toString(), "for duration", duration);

  console.log("Deployment complete. Set NEXT_PUBLIC_TRIV_ADDRESS and NEXT_PUBLIC_STAKING_ADDRESS in your .env to interact from the app.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
