import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying IQPoints with account:", deployer.address);

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

  let nonce = await ethers.provider.getTransactionCount(deployer.address, "pending");

  const IQPoints = await ethers.getContractFactory("IQPoints");
  const iq = await IQPoints.deploy({
    ...(await getBumpedFees()),
    nonce,
  });
  await iq.waitForDeployment();
  const iqAddress = await iq.getAddress();
  console.log("✅ IQPoints deployed to:", iqAddress);
  nonce += 1;

  const QuestManagerIQ = await ethers.getContractFactory("QuestManagerIQ");
  const qm = await QuestManagerIQ.deploy(iqAddress, {
    ...(await getBumpedFees()),
    nonce,
  });
  await qm.waitForDeployment();
  const qmAddress = await qm.getAddress();
  console.log("✅ QuestManagerIQ deployed to:", qmAddress);
  nonce += 1;

  const tx = await iq.setAwarder(qmAddress, true, {
    ...(await getBumpedFees()),
    nonce,
  });
  await tx.wait();
  console.log("✅ Authorized QuestManagerIQ as awarder");
  nonce += 1;

  // Optional: set relayer if provided
  const relayer = process.env.QUIZ_RELAYER_ADDRESS;
  if (relayer && relayer.trim().length > 0) {
    console.log("Setting relayer:", relayer);
    const setRelayerTx = await (await ethers.getContractAt("QuestManagerIQ", qmAddress)).setRelayer(relayer, {
      ...(await getBumpedFees()),
      nonce,
    });
    await setRelayerTx.wait();
    console.log("✅ Relayer set");
  }

  console.log("\n📝 Update your .env.local:");
  console.log("NEXT_PUBLIC_IQPOINTS_ADDRESS=" + iqAddress);
  console.log("NEXT_PUBLIC_QUEST_MANAGER_ADDRESS=" + qmAddress);
  
  console.log("\n🔍 To verify on Basescan:");
  console.log(`npx hardhat verify --network base ${iqAddress}`);
  console.log(`npx hardhat verify --network base ${qmAddress} ${iqAddress}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
