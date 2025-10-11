import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

async function main() {
  const DISTRIBUTOR_ADDRESS = process.env.DISTRIBUTOR_ADDRESS || process.env.DISTRIBUTOR || "0x380beE8741AAa18252Eb6640760337B4c4aA65b5";
  if (!DISTRIBUTOR_ADDRESS) throw new Error('Set DISTRIBUTOR_ADDRESS in env');

  // Use Hardhat's provider that's wired to the selected --network
  const provider = (ethers as any).provider;
  const dist = await ethers.getContractAt('TriviacastDistributor', DISTRIBUTOR_ADDRESS, provider as any);

  const amt: any = await (dist as any).dailyAmount();
  console.log('Distributor:', DISTRIBUTOR_ADDRESS);
  console.log('dailyAmount (raw):', amt.toString());
  try {
    console.log('dailyAmount (TRIV):', ethers.formatUnits(amt, 18));
  } catch (e) {
    console.log('Could not format units (missing decimals info)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
