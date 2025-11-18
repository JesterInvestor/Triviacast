import hre from "hardhat";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

async function main() {
  const env = process.env as Record<string, string | undefined>;

  const STAKING_ADDRESS = env.STAKING_ADDRESS || env.NEXT_PUBLIC_STAKING_ADDRESS || env.STAKING_CONTRACT_ADDRESS;
  if (!STAKING_ADDRESS) throw new Error("Missing STAKING_ADDRESS in hardhat/.env (or NEXT_PUBLIC_STAKING_ADDRESS)");

  // Helper to read CLI args like --token 0x.. --to 0x.. --amount 1.23 --force
  const argv = process.argv.slice(2);
  const getFlag = (name: string) => {
    const idx = argv.indexOf(`--${name}`);
    if (idx === -1) return undefined;
    return argv[idx + 1];
  };

  const tokenArg = getFlag("token") || env.RECOVER_TOKEN;
  const toArg = getFlag("to") || env.RECOVER_TO;
  const amountArg = getFlag("amount") || env.RECOVER_AMOUNT;
  const force = !!(getFlag("force") || env.FORCE_RECOVER);

  if (!tokenArg || !toArg || !amountArg) {
    console.error("Usage: npx hardhat run scripts/recover-tokens.ts --network <network> --token <tokenAddress> --to <recipient> --amount <amount> [--force]");
    throw new Error("Missing required args: --token, --to, --amount");
  }

  const [signer] = await hre.ethers.getSigners();
  console.log("Using signer:", signer.address);

  const provider = hre.ethers.provider;
  const stakingAbi = [
    "function stakingToken() view returns (address)",
    "function rewardToken() view returns (address)",
    "function recoverERC20(address,address,uint256) external",
  ];

  const erc20Abi = ["function decimals() view returns (uint8)"];

  const staking = new hre.ethers.Contract(STAKING_ADDRESS, stakingAbi, provider);

  // Check token safety: do not allow recovering staking or reward token
  const stakingTokenAddr = (await staking.connect(provider).stakingToken()).toLowerCase();
  const rewardTokenAddr = (await staking.connect(provider).rewardToken()).toLowerCase();
  const tokenAddr = tokenArg.trim().toLowerCase();
  if (tokenAddr === stakingTokenAddr || tokenAddr === rewardTokenAddr) {
    throw new Error("Refusing to recover staking or reward token");
  }

  // Read decimals and parse amount
  const token = new hre.ethers.Contract(tokenAddr, erc20Abi, provider);
  let decimals = 18;
  try {
    decimals = Number(await token.decimals());
  } catch (e) {
    console.warn("Could not read token decimals; defaulting to 18");
  }

  const parsedAmount = hre.ethers.parseUnits(amountArg, decimals);

  console.log(`Will call recoverERC20(${tokenAddr}, ${toArg}, ${parsedAmount.toString()}) from ${signer.address}`);
  if (!force) {
    console.log("Pass --force to skip confirmation and execute the transaction");
    return;
  }

  const stakingWithSigner = new hre.ethers.Contract(STAKING_ADDRESS, stakingAbi, signer);
  const tx = await stakingWithSigner.recoverERC20(tokenAddr, toArg, parsedAmount);
  console.log("Sent tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction mined in block", receipt.blockNumber);

  // Print a network explorer link if supported
  const network = hre.network.name;
  let explorer = "";
  if (network === "base") explorer = `https://basescan.org/tx/${tx.hash}`;
  else if (network === "baseSepolia") explorer = `https://sepolia.basescan.org/tx/${tx.hash}`;
  if (explorer) console.log("View:", explorer);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
