import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Helper: get bumped fee data to avoid underpriced txs on Base/OP stacks
  const getBumpedFees = async () => {
    const fee = await ethers.provider.getFeeData();
    // Defaults in case provider returns nulls
    const baseMaxFee = (fee.maxFeePerGas ?? fee.gasPrice ?? 0n);
    const baseTip = (fee.maxPriorityFeePerGas ?? 0n);
    const bump = (v: bigint) => ((v * 125n) / 100n) + 1n; // +25% + 1 wei
    const maxFeePerGas = bump(baseMaxFee > 0n ? baseMaxFee : 1_000_000_000n);
    const maxPriorityFeePerGas = bump(baseTip); // On Base this may be 0n; bump to 1 wei
    return { maxFeePerGas, maxPriorityFeePerGas };
  };

  // Manage nonces explicitly to avoid replacement issues if a pending tx exists
  let nextNonce = await ethers.provider.getTransactionCount(deployer.address, "pending");

  const IQPoints = await ethers.getContractFactory("IQPoints");
  const iq = await IQPoints.deploy({
    ...(await getBumpedFees()),
    nonce: nextNonce,
  });
  await iq.waitForDeployment();
  const iqAddress = await iq.getAddress();
  console.log("IQPoints:", iqAddress);
  nextNonce += 1;

  const QuestManagerIQ = await ethers.getContractFactory("QuestManagerIQ");
  const qm = await QuestManagerIQ.deploy(iqAddress, {
    ...(await getBumpedFees()),
    nonce: nextNonce,
  });
  await qm.waitForDeployment();
  const qmAddress = await qm.getAddress();
  console.log("QuestManagerIQ:", qmAddress);
  nextNonce += 1;

  const tx = await iq.setAwarder(qmAddress, true, {
    ...(await getBumpedFees()),
    nonce: nextNonce,
  });
  await tx.wait();
  console.log("Authorized QuestManagerIQ as awarder on IQPoints.");
  nextNonce += 1;

  // Optional: set relayer if provided
  const relayer = process.env.QUIZ_RELAYER_ADDRESS;
  if (relayer && relayer.trim().length > 0) {
    console.log("Setting relayer:", relayer);
    const setRelayerTx = await (await ethers.getContractAt("QuestManagerIQ", qmAddress)).setRelayer(relayer, {
      ...(await getBumpedFees()),
      nonce: nextNonce,
    });
    await setRelayerTx.wait();
    console.log("Relayer set.");
    nextNonce += 1;
  }

  console.log("\nSet these envs (frontend):");
  console.log("NEXT_PUBLIC_IQPOINTS_ADDRESS=" + iqAddress);
  console.log("NEXT_PUBLIC_QUEST_MANAGER_ADDRESS=" + qmAddress);
}

main().catch((e) => { console.error(e); process.exit(1); });
