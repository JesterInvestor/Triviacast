import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import path from "path";

// Load env files: base .env, then .env.distributor (or fallback example)
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });
const distEnvPath = path.resolve(__dirname, "..", ".env.distributor");
const distEnvExamplePath = path.resolve(__dirname, "..", ".env.distributor.example");
dotenv.config({ path: distEnvPath });
dotenv.config({ path: distEnvExamplePath });

// Env vars:
// TRIV_TOKEN: ERC20 token address for $TRIV
// TRIVIA_POINTS: deployed TriviaPoints contract address
// DAILY_AMOUNT: daily claim amount in wei (e.g., 50000000000000000 for $0.05 if 18 decimals and $TRIV is $1)
// TOP_AMOUNT: top-5 airdrop amount per wallet in wei (e.g., 500000000000000000 for $0.50)

async function main() {
  const TRIV_TOKEN = process.env.TRIV_TOKEN || "";
  const TRIVIA_POINTS = process.env.TRIVIA_POINTS || "";
  // Accept human amounts (e.g. DAILY_AMOUNT_HUMAN=1000) or raw wei in DAILY_AMOUNT
  const DAILY_AMOUNT_RAW = process.env.DAILY_AMOUNT || "0";
  const DAILY_AMOUNT_HUMAN = process.env.DAILY_AMOUNT_HUMAN || process.env.DAILY_AMOUNT_HUMAN || "";
  const TOP_AMOUNT_RAW = process.env.TOP_AMOUNT || "0";
  const TOP_AMOUNT_HUMAN = process.env.TOP_AMOUNT_HUMAN || "";

  const DAILY_AMOUNT = DAILY_AMOUNT_HUMAN && DAILY_AMOUNT_HUMAN.trim().length > 0
    ? ethers.parseUnits(DAILY_AMOUNT_HUMAN, 18).toString()
    : DAILY_AMOUNT_RAW;

  const TOP_AMOUNT = TOP_AMOUNT_HUMAN && TOP_AMOUNT_HUMAN.trim().length > 0
    ? ethers.parseUnits(TOP_AMOUNT_HUMAN, 18).toString()
    : TOP_AMOUNT_RAW;

  if (!TRIV_TOKEN || !TRIVIA_POINTS) {
    throw new Error("Missing TRIV_TOKEN or TRIVIA_POINTS env var");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());
  console.log("TRIV_TOKEN:", TRIV_TOKEN);
  console.log("TRIVIA_POINTS:", TRIVIA_POINTS);
  console.log("DAILY_AMOUNT:", DAILY_AMOUNT);
  console.log("TOP_AMOUNT:", TOP_AMOUNT);

  const Factory = await ethers.getContractFactory("TriviacastDistributor");
  const dist = await Factory.deploy(
    await deployer.getAddress(),
    TRIV_TOKEN,
    TRIVIA_POINTS,
    DAILY_AMOUNT,
    TOP_AMOUNT
  );
  await dist.waitForDeployment();
  const address = await dist.getAddress();
  console.log("TriviacastDistributor deployed to:", address);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
