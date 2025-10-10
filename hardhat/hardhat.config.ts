import { HardhatUserConfig } from "hardhat/config";
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
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || ""
    },
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
