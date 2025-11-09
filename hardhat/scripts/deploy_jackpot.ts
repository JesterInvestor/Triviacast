import { ethers } from "hardhat";

/**
 * Deploy Jackpot.sol to Base mainnet or testnet.
 * Requires env vars:
 *  VRF_COORDINATOR
 *  VRF_SUBSCRIPTION_ID
 *  VRF_KEYHASH
 *  USDC_ADDRESS
 *  TRIV_TOKEN_ADDRESS
 *  TRIVIAPOINTS_ADDRESS
 *  FEE_RECEIVER_ADDRESS
 *  SPIN_PRICE_USDC (e.g. 500000 for 0.5 USDC @ 6 decimals)
 *  POINTS_THRESHOLD (e.g. 100000)
 */
async function main() {
  const {
    VRF_COORDINATOR,
    VRF_SUBSCRIPTION_ID,
    VRF_KEYHASH,
    USDC_ADDRESS,
    TRIV_TOKEN_ADDRESS,
    TRIVIAPOINTS_ADDRESS,
    FEE_RECEIVER_ADDRESS,
    SPIN_PRICE_USDC,
    POINTS_THRESHOLD
  } = process.env as Record<string,string>;

  if (!VRF_COORDINATOR || !VRF_SUBSCRIPTION_ID || !VRF_KEYHASH) throw new Error("Missing VRF config env vars");
  if (!USDC_ADDRESS || !TRIV_TOKEN_ADDRESS || !TRIVIAPOINTS_ADDRESS || !FEE_RECEIVER_ADDRESS) throw new Error("Missing contract address env vars");

  // Normalize and sanitize addresses to avoid checksum errors (ethers v6 strict by default)
  const normAddr = (s: string) => {
    const t = s.trim();
    const hex = t.startsWith('0x') ? t.slice(2) : t;
    return ('0x' + hex).toLowerCase();
  };

  const price = SPIN_PRICE_USDC ? BigInt(SPIN_PRICE_USDC) : 500000n; // default 0.5 USDC (6 decimals)
  const threshold = POINTS_THRESHOLD ? BigInt(POINTS_THRESHOLD) : 100000n;
  const subId = VRF_SUBSCRIPTION_ID ? BigInt(VRF_SUBSCRIPTION_ID) : 0n; // VRF v2.5 uses uint256

  const Jackpot = await ethers.getContractFactory("Jackpot");
  const contract = await Jackpot.deploy(
    normAddr(VRF_COORDINATOR),
    subId,
    VRF_KEYHASH as `0x${string}`,
    normAddr(USDC_ADDRESS),
    normAddr(TRIV_TOKEN_ADDRESS),
    normAddr(TRIVIAPOINTS_ADDRESS),
    normAddr(FEE_RECEIVER_ADDRESS),
    price,
    threshold
  );
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("Jackpot deployed at:", address);
  console.log("Verify after a few blocks with: npx hardhat verify --network base", address, VRF_COORDINATOR, VRF_SUBSCRIPTION_ID, VRF_KEYHASH, USDC_ADDRESS, TRIV_TOKEN_ADDRESS, TRIVIAPOINTS_ADDRESS, FEE_RECEIVER_ADDRESS, price.toString(), threshold.toString());
}

main().catch((e) => { console.error(e); process.exit(1); });
