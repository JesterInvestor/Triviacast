import { ethers } from "hardhat";

async function main() {
  const qmAddr = process.env.QUESTMANAGER_ADDRESS;
  const iqAddr = process.env.IQPOINTS_ADDRESS;
  if (!qmAddr || !iqAddr) {
    console.log("Set IQPOINTS_ADDRESS and QUESTMANAGER_ADDRESS env vars");
    process.exit(1);
  }
  const qm = await ethers.getContractAt("QuestManagerIQ", qmAddr);
  const iq = await ethers.getContractAt("IQPoints", iqAddr);

  const iqInQM = await qm.iqPoints();
  const awarder = await iq.awarder(qmAddr);

  const q1 = await qm.quest(1);
  const q4 = await qm.quest(4);
  const q5 = await qm.quest(5);

  console.log("QuestManager:", qmAddr);
  console.log("IQPoints:", iqAddr);
  console.log("- qm.iqPoints():", iqInQM);
  console.log("- iq.awarder(qm):", awarder);
  console.log("Quest 1 (Cast) amount:", q1.amount.toString(), "enabled:", q1.enabled);
  console.log("Quest 4 (Follow) amount:", q4.amount.toString(), "enabled:", q4.enabled);
  console.log("Quest 5 (Daily) amount:", q5.amount.toString(), "enabled:", q5.enabled);
}

main().catch((e) => { console.error(e); process.exit(1); });
