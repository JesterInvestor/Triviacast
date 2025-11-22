import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

function bump(v: bigint) {
  // bump ~25% and add a tiny increment
  return ((v * 125n) / 100n) + 1n;
}

async function main() {
  const TRIV = process.env.TRIV_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_TRIV_ADDRESS;
  const STAKING_ADDR = process.env.STAKING_ADDRESS || process.env.NEXT_PUBLIC_STAKING_ADDRESS;
  if (!TRIV) throw new Error("TRIV token address env missing");
  if (!STAKING_ADDR) throw new Error("STAKING address env missing");

  const APR_PERCENT = process.env.REWARD_APR_PERCENT ? Number(process.env.REWARD_APR_PERCENT) : 80;
  const STAKING = await ethers.getContractAt("SimpleStaking", STAKING_ADDR);
  const TRIVCON = await ethers.getContractAt("TRIVToken", TRIV);

  const totalSupply = await STAKING.totalSupply();
  console.log("totalSupply (wei):", totalSupply.toString());

  const totalWei = BigInt(totalSupply.toString());
  const aprPercent = BigInt(Math.round(APR_PERCENT));
  const dailyWei = (totalWei * aprPercent) / BigInt(100) / BigInt(365);
  if (dailyWei === BigInt(0)) throw new Error("Computed daily reward is 0");

  const dailyFormatted = ethers.formatUnits(dailyWei.toString(), 18);
  console.log(`Computed daily: ${dailyFormatted} TRIV (${dailyWei.toString()} wei)`);

  const [signer] = await ethers.getSigners();
  const fee = await ethers.provider.getFeeData();
  const maxFeePerGas = bump(fee.maxFeePerGas ?? fee.gasPrice ?? 0n);
  const maxPriorityFeePerGas = bump(fee.maxPriorityFeePerGas ?? 0n);

  const nonce = await ethers.provider.getTransactionCount(await signer.getAddress(), 'pending');
  console.log('Using fees:', { maxFeePerGas: maxFeePerGas.toString(), maxPriorityFeePerGas: maxPriorityFeePerGas.toString(), nonce });

  // Ensure staking contract has allowance — we assume approve already done. Attempt notify with bumped fees.
  const duration = 60 * 60 * 24;
  console.log('Calling notifyRewardAmount with bumped fees...');
  const tx = await STAKING.connect(signer).notifyRewardAmount(dailyWei.toString(), duration, {
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    nonce,
  } as any);
  console.log('notify tx submitted:', tx.hash);
  const r = await tx.wait();
  console.log('notify tx confirmed in block', r.blockNumber);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
