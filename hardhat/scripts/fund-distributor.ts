import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import path from "path";

// Load env
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Expects in env:
// TRIV_TOKEN - ERC20 token address for $TRIV
// DISTRIBUTOR_ADDRESS - distributor contract address
// FUND_AMOUNT - human amount to transfer (e.g., "10000") default 10000

async function main() {
  const TRIV_TOKEN = process.env.TRIV_TOKEN || process.env.NEXT_PUBLIC_TRIV_ADDRESS || "";
  const DISTRIBUTOR_ADDRESS = process.env.DISTRIBUTOR_ADDRESS || process.env.TRIVIA_DISTRIBUTOR || process.env.DISTRIBUTOR || "";
  const FUND_AMOUNT = process.env.FUND_AMOUNT || "10000"; // human TRIV amount

  if (!TRIV_TOKEN) throw new Error("TRIV_TOKEN env var is required");
  if (!DISTRIBUTOR_ADDRESS) throw new Error("DISTRIBUTOR_ADDRESS env var is required");

  const [owner] = await ethers.getSigners();
  console.log("Funding from:", await owner.getAddress());
  console.log("TRIV token:", TRIV_TOKEN);
  console.log("Distributor:", DISTRIBUTOR_ADDRESS);
  console.log("Amount:", FUND_AMOUNT, "TRIV");

  const token = await ethers.getContractAt("IERC20", TRIV_TOKEN);
  const amountWei = ethers.parseUnits(FUND_AMOUNT, 18);

  const tx = await (token as any).connect(owner).transfer(DISTRIBUTOR_ADDRESS, amountWei);
  console.log("Transfer submitted:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transfer confirmed in block", receipt.blockNumber);
  console.log("Done: transferred", FUND_AMOUNT, "TRIV to distributor");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
