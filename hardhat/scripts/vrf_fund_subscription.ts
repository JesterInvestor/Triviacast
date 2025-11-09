import { ethers } from "hardhat";

// Fund a VRF v2.5 subscription with LINK by calling LINK's transferAndCall
// Usage examples:
//   npx hardhat run scripts/vrf_fund_subscription.ts --network base --amount 2.0
//   npx hardhat run scripts/vrf_fund_subscription.ts --network base --amount-wei 2000000000000000000
// Env required:
//   LINK_TOKEN_ADDRESS (ERC677 LINK on Base)
//   VRF_COORDINATOR
//   VRF_SUBSCRIPTION_ID (uint256)

const LINK_ABI = [
  // ERC20
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  // ERC677 extension used by Chainlink LINK
  "function transferAndCall(address to, uint value, bytes data) returns (bool success)"
];

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return undefined;
}

async function main() {
  const { LINK_TOKEN_ADDRESS, VRF_COORDINATOR, VRF_SUBSCRIPTION_ID } = process.env as Record<string,string>;
  if (!LINK_TOKEN_ADDRESS) throw new Error("LINK_TOKEN_ADDRESS not set");
  if (!VRF_COORDINATOR) throw new Error("VRF_COORDINATOR not set");
  if (!VRF_SUBSCRIPTION_ID) throw new Error("VRF_SUBSCRIPTION_ID not set");

  const amountStr = getArg("--amount");
  const amountWeiStr = getArg("--amount-wei");
  if (!amountStr && !amountWeiStr) {
    throw new Error("Provide --amount <LINK> (e.g. 2.0) or --amount-wei <wei>");
  }

  const signer = (await ethers.getSigners())[0];
  const link = new ethers.Contract(LINK_TOKEN_ADDRESS, LINK_ABI, signer);
  const decimals: number = await link.decimals();
  const amount = amountWeiStr
    ? BigInt(amountWeiStr)
    : ethers.parseUnits(amountStr as string, decimals);

  const subId = BigInt(VRF_SUBSCRIPTION_ID);
  const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [subId]);

  const bal: bigint = await link.balanceOf(await signer.getAddress());
  if (bal < amount) throw new Error(`Insufficient LINK balance. Have ${bal.toString()} wei, need ${amount.toString()} wei.`);

  console.log(`Funding subscription ${subId.toString()} with ${amount.toString()} wei LINK via transferAndCall -> ${VRF_COORDINATOR}`);
  const tx = await link.transferAndCall(VRF_COORDINATOR, amount, data);
  console.log("tx:", tx.hash);
  await tx.wait();
  console.log("Success: subscription funded.")
}

main().catch((e) => { console.error(e); process.exit(1); });
