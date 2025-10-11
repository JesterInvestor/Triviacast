import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import path from "path";

// Load env: hardhat/.env then repo .env
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Expects in hardhat/.env or repo .env:
// DISTRIBUTOR_ADDRESS - address of deployed TriviacastDistributor
// DAILY_AMOUNT - human-readable amount (optional) - if not provided, script uses 1000

async function main() {
  const DISTRIBUTOR_ADDRESS = process.env.DISTRIBUTOR_ADDRESS || process.env.TRIVIA_DISTRIBUTOR || process.env.DISTRIBUTOR || "";
  const RAW_AMOUNT = process.env.DAILY_AMOUNT || "1000"; // default to 1000 TRIV

  if (!DISTRIBUTOR_ADDRESS) {
    throw new Error("DISTRIBUTOR_ADDRESS env var is required (set in hardhat/.env or .env)");
  }

  const amountHuman = RAW_AMOUNT; // e.g. "1000"
  const amountWei = ethers.parseUnits(amountHuman, 18);

  const [owner] = await ethers.getSigners();
  console.log("Using owner:", await owner.getAddress());
  console.log("Distributor:", DISTRIBUTOR_ADDRESS);
  console.log("Setting dailyAmount to:", amountHuman, "TRIV (wei:", amountWei.toString(), ")");

  const Factory = await ethers.getContractFactory("TriviacastDistributor");
  const dist = Factory.attach(DISTRIBUTOR_ADDRESS);

  // TypeChain in this repo exposes contract factories but for scripting we cast to any to call methods
  const tx = await (dist as any).connect(owner).setDailyAmount(amountWei);
  console.log("Transaction submitted:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block", receipt.blockNumber);
  console.log("Done: dailyAmount set to", amountHuman, "TRIV");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
