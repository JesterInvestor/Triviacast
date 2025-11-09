import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const IQPoints = await ethers.getContractFactory("IQPoints");
  const iq = await IQPoints.deploy();
  await iq.waitForDeployment();
  const iqAddress = await iq.getAddress();
  console.log("IQPoints:", iqAddress);

  const QuestManagerIQ = await ethers.getContractFactory("QuestManagerIQ");
  const qm = await QuestManagerIQ.deploy(iqAddress);
  await qm.waitForDeployment();
  const qmAddress = await qm.getAddress();
  console.log("QuestManagerIQ:", qmAddress);

  const tx = await iq.setAwarder(qmAddress, true);
  await tx.wait();
  console.log("Authorized QuestManagerIQ as awarder on IQPoints.");

  // Optional: set relayer if provided
  const relayer = process.env.QUIZ_RELAYER_ADDRESS;
  if (relayer && relayer.trim().length > 0) {
    console.log("Setting relayer:", relayer);
    const setRelayerTx = await (await ethers.getContractAt("QuestManagerIQ", qmAddress)).setRelayer(relayer);
    await setRelayerTx.wait();
    console.log("Relayer set.");
  }

  console.log("\nSet these envs (frontend):");
  console.log("NEXT_PUBLIC_IQPOINTS_ADDRESS=" + iqAddress);
  console.log("NEXT_PUBLIC_QUEST_MANAGER_ADDRESS=" + qmAddress);
}

main().catch((e) => { console.error(e); process.exit(1); });
