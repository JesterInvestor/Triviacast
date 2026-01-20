import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TriviaPointsV2 with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Helper: bump fees to avoid Base underpriced errors
  const getBumpedFees = async () => {
    const fee = await ethers.provider.getFeeData();
    const baseMaxFee = fee.maxFeePerGas ?? fee.gasPrice ?? 1_000_000_000n;
    const baseTip = fee.maxPriorityFeePerGas ?? 0n;
    const bump = (v: bigint) => ((v * 125n) / 100n) + 1n;
    return {
      maxFeePerGas: bump(baseMaxFee),
      maxPriorityFeePerGas: bump(baseTip > 0n ? baseTip : 1n),
    };
  };

  const nonce = await ethers.provider.getTransactionCount(deployer.address, "pending");

  const TriviaPointsV2 = await ethers.getContractFactory("TriviaPointsV2");
  const contract = await TriviaPointsV2.deploy({
    ...(await getBumpedFees()),
    nonce,
  });

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("\n✅ TriviaPointsV2 deployed to:", address);
  console.log("\nUpdate your .env.local:");
  console.log("NEXT_PUBLIC_TRIVIAPOINTS_ADDRESS=" + address);
  console.log("\nTo verify on Basescan:");
  console.log(`npx hardhat verify --network base ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
