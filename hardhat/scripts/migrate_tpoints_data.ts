import { ethers } from "hardhat";

/**
 * Migration script to copy data from old TriviaPoints to TriviaPointsV2
 * 
 * Usage:
 * 1. Set OLD_TPOINTS_ADDRESS and NEW_TPOINTS_ADDRESS in hardhat/.env
 * 2. Run: cd hardhat && npx hardhat run scripts/migrate_tpoints_data.ts --network base
 */
async function main() {
  const oldAddress = process.env.OLD_TPOINTS_ADDRESS;
  const newAddress = process.env.NEW_TPOINTS_ADDRESS;

  if (!oldAddress || !newAddress) {
    throw new Error("Set OLD_TPOINTS_ADDRESS and NEW_TPOINTS_ADDRESS in hardhat/.env");
  }

  const [deployer] = await ethers.getSigners();
  console.log("Migrating data with account:", deployer.address);

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

  const oldContract = await ethers.getContractAt("TriviaPoints", oldAddress);
  const newContract = await ethers.getContractAt("TriviaPointsV2", newAddress);

  const totalWallets = await oldContract.getTotalWallets();
  console.log(`Total wallets to migrate: ${totalWallets}`);

  // Fetch leaderboard in batches (use small limit to avoid gas issues)
  const batchSize = 50;
  const batches = Math.ceil(Number(totalWallets) / batchSize);

  let allWallets: string[] = [];
  let allPoints: bigint[] = [];

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const remaining = Number(totalWallets) - start;
    const limit = remaining < batchSize ? remaining : batchSize;

    console.log(`Fetching batch ${i + 1}/${batches} (${limit} wallets)...`);
    
    try {
      const [addresses, points] = await oldContract.getLeaderboard(limit);
      allWallets.push(...addresses);
      allPoints.push(...points);
    } catch (e) {
      console.error(`Failed to fetch batch ${i + 1}:`, e);
      // Try smaller batch if this fails
      break;
    }
  }

  console.log(`\nFetched ${allWallets.length} wallets with points`);

  // Import in batches to new contract
  const importBatchSize = 100;
  const importBatches = Math.ceil(allWallets.length / importBatchSize);

  for (let i = 0; i < importBatches; i++) {
    const start = i * importBatchSize;
    const end = Math.min(start + importBatchSize, allWallets.length);
    const walletBatch = allWallets.slice(start, end);
    const pointsBatch = allPoints.slice(start, end);

    console.log(`Importing batch ${i + 1}/${importBatches} (${walletBatch.length} wallets)...`);

    const nonce = await ethers.provider.getTransactionCount(deployer.address, "pending");
    const tx = await newContract.batchImport(walletBatch, pointsBatch, {
      ...(await getBumpedFees()),
      nonce,
    });

    await tx.wait();
    console.log(`✅ Batch ${i + 1} imported`);
  }

  console.log("\n✅ Migration complete!");
  console.log("Total wallets migrated:", allWallets.length);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
