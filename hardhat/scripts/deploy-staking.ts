import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with", deployer.address);

  // If TRIV_TOKEN_ADDRESS is set in environment, reuse that token. Otherwise deploy a new TRIV.
  const existingTriv = process.env.TRIV_TOKEN_ADDRESS;
  let trivAddress: string;

  if (existingTriv && existingTriv !== "") {
    console.log("Using existing TRIV token at:", existingTriv);
    trivAddress = existingTriv;
  } else {
    console.log("No TRIV_TOKEN_ADDRESS found in env — deploying a new TRIV token.");
    const TRIV = await ethers.getContractFactory("TRIVToken");
    const triv = await TRIV.deploy();
    await triv.deployed();
    trivAddress = triv.target || triv.address;
    console.log("TRIV deployed to:", trivAddress);

    // Mint some tokens to deployer for testing
    const mintAmount = ethers.parseUnits("1000000", 18);
    const tx = await triv.mint(deployer.address, mintAmount);
    await tx.wait();
    console.log("Minted", mintAmount.toString(), "TRIV to deployer");
  }

  const Staking = await ethers.getContractFactory("SimpleStaking");
  const staking = await Staking.deploy(trivAddress, trivAddress);
  await staking.deployed();
  const stakingAddress = staking.target || staking.address;
  console.log("Staking deployed to:", stakingAddress);

  // If we deployed a new TRIV above (i.e., env var not set), fund rewards automatically.
  if (!existingTriv) {
    // Approve and fund rewards (example: 100k TRIV over 30 days)
    const triv = (await ethers.getContractAt("TRIVToken", trivAddress)) as any;
    const rewardAmount = ethers.parseUnits("100000", 18);
    await triv.approve(stakingAddress, rewardAmount);
    const duration = 60 * 60 * 24 * 30; // 30 days
    const fundTx = await staking.notifyRewardAmount(rewardAmount, duration);
    await fundTx.wait();
    console.log("Funded rewards:", rewardAmount.toString(), "for duration", duration);
  } else {
    console.log("TRIV_TOKEN_ADDRESS provided — not funding rewards automatically. Use the token owner to transfer/approve reward tokens and call notifyRewardAmount.");
  }

  console.log("Deployment complete.");
  console.log("Frontend: set NEXT_PUBLIC_TRIV_ADDRESS=", trivAddress);
  console.log("Frontend: set NEXT_PUBLIC_STAKING_ADDRESS=", stakingAddress);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
