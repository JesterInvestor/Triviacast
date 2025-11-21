import dotenv from "dotenv";
import path from "path";
import { ethers } from "hardhat";

// Ensure we load the repo root .env.local when running from hardhat/ folder
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env.local") });

async function main() {
  const trivAddress = process.env.TRIV_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_TRIV_ADDRESS;
  const claimAddress = process.env.CLAIM_CONTRACT_ADDRESS;
  const amountStr = process.env.FUND_AMOUNT_TRIV || "10000000"; // default 10,000,000 TRIV

  if (!trivAddress) throw new Error("TRIV token address not set. Set TRIV_TOKEN_ADDRESS or NEXT_PUBLIC_TRIV_ADDRESS in .env");
  if (!claimAddress) throw new Error("CLAIM_CONTRACT_ADDRESS not set in environment (.env)");

  // parseUnits helper for ethers v5/v6 compatibility
  const parseUnits = (ethers as any).parseUnits ?? (ethers as any).utils?.parseUnits;
  if (!parseUnits) throw new Error('parseUnits not available on ethers; check ethers version');

  const amount = parseUnits(amountStr, 18);

  const signers = await (ethers as any).getSigners();
  const signer = signers[0];
  console.log("Using signer:", signer.address);

  const erc20Abi = ["function transfer(address to,uint256 amount) returns (bool)"];
  const token = new (ethers as any).Contract(trivAddress, erc20Abi, signer);

  console.log(`Transferring ${amountStr} TRIV (${amount.toString()}) to ${claimAddress}...`);
  const tx = await token.transfer(claimAddress, amount);
  console.log("Sent tx:", tx.hash || tx.transactionHash || tx.txHash || 'unknown');

  // wait for confirmation (compat)
  if (tx.wait) {
    await tx.wait();
  } else if (typeof tx.waitForReceipt === 'function') {
    await tx.waitForReceipt();
  }

  console.log('Transfer confirmed');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
