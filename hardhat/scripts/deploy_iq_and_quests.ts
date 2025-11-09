import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const IQPoints = await ethers.getContractFactory("IQPoints");
  const iq = await IQPoints.deploy();
  await iq.deployed();
  console.log("IQPoints:", iq.address);

  const QuestManagerIQ = await ethers.getContractFactory("QuestManagerIQ");
  const qm = await QuestManagerIQ.deploy(iq.address);
  await qm.deployed();
  console.log("QuestManagerIQ:", qm.address);

  const tx = await iq.setAwarder(qm.address, true);
  await tx.wait();
  console.log("Authorized QuestManagerIQ as awarder on IQPoints.");

  console.log("\nSet these envs (frontend):");
  console.log("NEXT_PUBLIC_IQPOINTS_ADDRESS=" + iq.address);
  console.log("NEXT_PUBLIC_QUEST_MANAGER_ADDRESS=" + qm.address);
}

main().catch((e) => { console.error(e); process.exit(1); });
