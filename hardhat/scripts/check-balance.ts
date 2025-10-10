import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(address);
  const balanceEth = ethers.formatEther(balance);

  console.log("=".repeat(60));
  console.log("Deployer Address:", address);
  console.log("Balance:", balanceEth, "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("=".repeat(60));

  if (balance === 0n) {
    console.log("\n⚠️  WARNING: Balance is 0 ETH!");
    console.log("You need ETH to deploy contracts.");
    console.log("\nTo get ETH on Base mainnet:");
    console.log("1. Bridge from Ethereum: https://bridge.base.org/");
    console.log("2. Or buy directly via Coinbase");
  } else {
    console.log("\n✅ Wallet has funds and is ready to deploy!");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
