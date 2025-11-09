import { ethers } from "hardhat"
import { IQPoints__factory, QuestManagerIQ__factory } from "../typechain-types"

/**
 * Quick sanity test for QuestManagerIQ + IQPoints deployment.
 * Usage (PowerShell):
 *   $env:IQPOINTS_ADDRESS="0x..."; $env:QUESTMANAGER_ADDRESS="0x..."; npx hardhat run scripts/test_quests.ts --network base
 */
async function main() {
  const iqAddr = process.env.IQPOINTS_ADDRESS
  const qmAddr = process.env.QUESTMANAGER_ADDRESS
  if (!iqAddr || !qmAddr) throw new Error("Set IQPOINTS_ADDRESS and QUESTMANAGER_ADDRESS env vars")

  const [signer] = await ethers.getSigners()
  console.log("Tester (signer):", signer.address)
  console.log("IQPoints:", iqAddr)
  console.log("QuestManagerIQ:", qmAddr)

  const iq = IQPoints__factory.connect(iqAddr, signer)
  const qm = QuestManagerIQ__factory.connect(qmAddr, signer)

  const before = await iq.getPoints(signer.address)
  console.log("Points before:", before.toString())

  console.log("Claiming Daily +1 iQ (id=5)...")
  const tx1 = await qm.claimDailyOneIQ()
  await tx1.wait()
  const mid = await iq.getPoints(signer.address)
  console.log("Points after +1:", mid.toString())

  console.log("Claiming Follow @jesterinvestor (id=4)...")
  const tx2 = await qm.claimFollowJester()
  await tx2.wait()
  const after = await iq.getPoints(signer.address)
  console.log("Points after +5:", after.toString())

  console.log("Attempting second Daily +1 (should revert)...")
  try {
  const tx3 = await qm.claimDailyOneIQ()
    await tx3.wait()
    console.log("Unexpected: second claim succeeded")
  } catch (e: any) {
    console.log("Expected revert on double-claim:", e?.message || e)
  }
}

main().catch((e) => { console.error(e); process.exit(1); })
