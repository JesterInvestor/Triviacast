import { ethers } from "hardhat";

async function main() {
  const distributor = process.env.DISTRIBUTOR_ADDRESS;
  if (!distributor) throw new Error("Set DISTRIBUTOR_ADDRESS env var");
  const abi = [
    { inputs: [], name: "airdropTop5", outputs: [], stateMutability: "nonpayable", type: "function" },
  ];
  const [signer] = await ethers.getSigners();
  const c = new ethers.Contract(distributor, abi, signer);
  const tx = await c.airdropTop5();
  console.log("airdropTop5 tx:", tx.hash);
  await tx.wait();
  console.log("airdropTop5 confirmed");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
