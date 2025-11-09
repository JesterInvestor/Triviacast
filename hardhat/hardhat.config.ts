import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const NORMALIZED_PRIVATE_KEY = PRIVATE_KEY
  ? (PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : ("0x" + PRIVATE_KEY))
  : "";
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const BASE_MAINNET_RPC_URL = process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: { enabled: false, runs: 200 }
    }
  },
  paths: {
    sources: path.resolve(__dirname, "contracts"),
    artifacts: path.resolve(__dirname, "artifacts"),
    cache: path.resolve(__dirname, "cache"),
    tests: path.resolve(__dirname, "test")
  },
  networks: {
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: NORMALIZED_PRIVATE_KEY ? [NORMALIZED_PRIVATE_KEY] : []
    },
    base: {
      url: BASE_MAINNET_RPC_URL,
      chainId: 8453,
      accounts: NORMALIZED_PRIVATE_KEY ? [NORMALIZED_PRIVATE_KEY] : []
    }
  },
  etherscan: {
    // Prefer a single Etherscan v2 API key; fallback to BASESCAN_API_KEY for backwards compatibility
    apiKey: process.env.ETHERSCAN_API_KEY || process.env.BASESCAN_API_KEY || "",
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      },
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      }
    ]
  }
};

export default config;

// Custom task to deploy Jackpot contract quickly
task("jackpot:deploy", "Deploy Jackpot contract")
  .setAction(async (_, hre) => {
    const env = process.env as Record<string,string>;
    const required = [
      'VRF_COORDINATOR', 'VRF_SUBSCRIPTION_ID', 'VRF_KEYHASH',
      'USDC_ADDRESS', 'TRIV_TOKEN_ADDRESS', 'TRIVIAPOINTS_ADDRESS', 'FEE_RECEIVER_ADDRESS'
    ];
    for (const k of required) if (!env[k]) throw new Error(`Missing env var ${k}`);
    const price = env.SPIN_PRICE_USDC ? BigInt(env.SPIN_PRICE_USDC) : 500000n;
    const threshold = env.POINTS_THRESHOLD ? BigInt(env.POINTS_THRESHOLD) : 100000n;
    const Jackpot = await hre.ethers.getContractFactory('Jackpot');
    const norm = (s: string) => {
      const t = s.trim();
      const hex = t.startsWith('0x') ? t.slice(2) : t;
      return ('0x' + hex).toLowerCase();
    };
    // Bump fees similar to other deploy script to avoid Base replacement underpriced errors
    const fee = await hre.ethers.provider.getFeeData();
    const bump = (v: bigint) => ((v * 125n) / 100n) + 1n;
    const maxFeePerGas = bump(fee.maxFeePerGas ?? fee.gasPrice ?? 0n);
    const maxPriorityFeePerGas = bump(fee.maxPriorityFeePerGas ?? 0n);
    let nonce = await hre.ethers.provider.getTransactionCount((await hre.ethers.getSigners())[0].address, 'pending');
    const contract = await Jackpot.deploy(
      norm(env.VRF_COORDINATOR),
      BigInt(env.VRF_SUBSCRIPTION_ID),
      env.VRF_KEYHASH as `0x${string}`,
      norm(env.USDC_ADDRESS),
      norm(env.TRIV_TOKEN_ADDRESS),
      norm(env.TRIVIAPOINTS_ADDRESS),
      norm(env.FEE_RECEIVER_ADDRESS),
      price,
      threshold,
      { maxFeePerGas, maxPriorityFeePerGas, nonce }
    );
    await contract.waitForDeployment();
    const addr = await contract.getAddress();
    console.log('Jackpot deployed at', addr);
  });
