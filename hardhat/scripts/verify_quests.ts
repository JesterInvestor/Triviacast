import { ethers } from "hardhat";

// Minimal ABI fragments to avoid artifact/name resolution (which triggered resolveName error)
const questManagerAbi = [
  "function iqPoints() view returns (address)",
  "function quest(uint8 id) view returns (uint256 amount,bool enabled)",
];
const iqPointsAbi = [
  "function awarder(address) view returns (bool)",
  "function getPoints(address user) view returns (uint256)",
];

async function main() {
  const qmAddr = process.env.QUESTMANAGER_ADDRESS;
  const iqAddr = process.env.IQPOINTS_ADDRESS;
  if (!qmAddr || !iqAddr) {
    console.log("Set IQPOINTS_ADDRESS and QUESTMANAGER_ADDRESS env vars");
    process.exit(1);
  }
  const [signer] = await ethers.getSigners();
  const qm = new ethers.Contract(qmAddr, questManagerAbi, signer);
  const iq = new ethers.Contract(iqAddr, iqPointsAbi, signer);

  const iqInQM = await qm.iqPoints();
  const awarder = await iq.awarder(qmAddr);

  const [q1, q4, q5] = await Promise.all([
    qm.quest(1),
    qm.quest(4),
    qm.quest(5),
  ]);

  console.log("QuestManager:", qmAddr);
  console.log("IQPoints:", iqAddr);
  console.log("- qm.iqPoints():", iqInQM);
  console.log("- iq.awarder(qm):", awarder);
  console.log("Quest 1 (Cast) amount:", q1.amount.toString(), "enabled:", q1.enabled);
  console.log("Quest 4 (Follow) amount:", q4.amount.toString(), "enabled:", q4.enabled);
  console.log("Quest 5 (Daily) amount:", q5.amount.toString(), "enabled:", q5.enabled);
  if (q1.amount.toString() === "2" && q4.amount.toString() === "50" && q5.amount.toString() === "1" && awarder) {
    console.log("✅ Deployment matches expected new quest rewards.");
  } else {
    console.log("⚠️ Deployment does not match expected rewards (2/50/1) or awarder missing.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
