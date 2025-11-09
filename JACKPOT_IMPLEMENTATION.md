# $TRIV Jackpot Implementation Guide

## Overview
This document provides a comprehensive guide for implementing and deploying the $TRIV jackpot spin wheel feature with on-chain randomness.

## Features Implemented

### 1. **Spin Wheel Component**
- Interactive canvas-based spinning wheel
- Smooth animations with CSS transitions
- Visual prize segments with custom colors
- Pointer indicator for winning selection
- Responsive design matching app theme

### 2. **Smart Contract (TriviaJackpot.sol)**
- On-chain randomness using block data
- Six prize tiers with configurable odds
- Spin history tracking
- Owner and operator roles for management
- Gas-efficient prize determination algorithm

### 3. **Prize Tiers & Odds**
| Prize Tier | Amount | Probability | Color |
|------------|--------|-------------|-------|
| Jackpot | 10,000,000 $TRIV | 0.1% | #FF6B9D |
| Mega | 1,000,000 $TRIV | 1% | #FFB6C1 |
| Big | 100,000 $TRIV | 5% | #FFC4D1 |
| Medium | 10,000 $TRIV | 10% | #FFD1DC |
| Small | 1,000 $TRIV | 20% | #FFE4EC |
| Tiny | 100 $TRIV | 63.9% | #FFF0F5 |

### 4. **Information Modal**
- Complete prize breakdown
- How-to instructions
- Technical details
- Rules and tips
- Responsive design with animations

### 5. **User Features**
- Wallet connection requirement
- Spin history tracking
- Total winnings display
- Local storage for persistence
- Success animations and notifications

## Architecture

### Frontend Components

1. **SpinWheel.tsx** (`/components/SpinWheel.tsx`)
   - Canvas-based wheel rendering
   - Animation handling
   - Prize selection logic
   - User interaction management

2. **JackpotInfoModal.tsx** (`/components/JackpotInfoModal.tsx`)
   - Information display
   - Prize details
   - Rules and instructions
   - Modal overlay with animations

3. **JackpotPage** (`/app/jackpot/page.tsx`)
   - Main page component
   - Wallet integration
   - State management
   - User statistics tracking

### Smart Contract

**TriviaJackpot.sol** (`/contracts/TriviaJackpot.sol`)
- Prize distribution logic
- Random number generation
- Spin execution
- Owner management functions
- Event emission for tracking

## Deployment Guide

### Prerequisites
- Node.js 18+ installed
- Hardhat or Foundry for contract deployment
- $TRIV token contract deployed
- Wallet with ETH for gas fees
- CDP API keys (optional, for production)

### Step 1: Deploy Smart Contract

#### Using Hardhat:

```bash
# Install Hardhat if not already installed
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Create Hardhat config
npx hardhat init

# Add Base Sepolia network to hardhat.config.ts
```

**hardhat.config.ts:**
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.27",
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
    base: {
      url: process.env.BASE_RPC || "https://mainnet.base.org",
      accounts: [process.env.PRIVATE_KEY || ""],
    },
  },
};

export default config;
```

**Deploy script (scripts/deploy-jackpot.ts):**
```typescript
import { ethers } from "hardhat";

async function main() {
  console.log("Deploying TriviaJackpot...");

  const TriviaJackpot = await ethers.getContractFactory("TriviaJackpot");
  const jackpot = await TriviaJackpot.deploy();
  await jackpot.waitForDeployment();

  const address = await jackpot.getAddress();
  console.log("TriviaJackpot deployed to:", address);

  // Set the TRIV token address
  const TRIV_TOKEN = "0x73385Ee7392C105d5898048F96a1bDF551B2D936";
  const tx = await jackpot.setTrivToken(TRIV_TOKEN);
  await tx.wait();
  console.log("TRIV token set to:", TRIV_TOKEN);

  // Fund the jackpot pool (optional)
  // await jackpot.fundJackpot(ethers.parseEther("1000000"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Deploy commands:**
```bash
# Deploy to Base Sepolia (testnet)
npx hardhat run scripts/deploy-jackpot.ts --network baseSepolia

# Deploy to Base (mainnet)
npx hardhat run scripts/deploy-jackpot.ts --network base
```

### Step 2: Configure Environment Variables

Add to `.env.local`:
```bash
# Jackpot contract address (from deployment)
NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS=0x...

# Network settings
NEXT_PUBLIC_CHAIN_ID=8453  # 8453 for Base mainnet, 84532 for Base Sepolia

# RPC endpoint
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
```

### Step 3: Create Contract Interface

Create `/lib/jackpot.ts`:
```typescript
import { readContract, writeContract, waitForTransactionReceipt } from "@wagmi/core";
import { wagmiConfig } from "./wagmi";
import { base, baseSepolia } from "viem/chains";

const JACKPOT_CONTRACT = process.env.NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS as `0x${string}`;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532");
const activeChain = CHAIN_ID === 8453 ? base : baseSepolia;

const JACKPOT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "spin",
    "outputs": [{"internalType": "uint256", "name": "prize", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPrizeInfo",
    "outputs": [
      {"internalType": "uint256[]", "name": "prizes", "type": "uint256[]"},
      {"internalType": "uint256[]", "name": "odds", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "getPlayerSpins",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "player", "type": "address"},
          {"internalType": "uint256", "name": "prize", "type": "uint256"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "randomSeed", "type": "uint256"}
        ],
        "internalType": "struct TriviaJackpot.SpinResult[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export async function executeSpin(playerAddress: string): Promise<number> {
  try {
    const hash = await writeContract(wagmiConfig, {
      address: JACKPOT_CONTRACT,
      abi: JACKPOT_ABI,
      functionName: 'spin',
      args: [playerAddress as `0x${string}`],
      chainId: activeChain.id,
    });

    const receipt = await waitForTransactionReceipt(wagmiConfig, {
      hash,
      chainId: activeChain.id,
    });

    // Parse logs to get prize amount
    // Return prize index for wheel animation
    return 0; // Placeholder
  } catch (error) {
    console.error("Error executing spin:", error);
    throw error;
  }
}

export async function getPrizeInfo() {
  try {
    const result = await readContract(wagmiConfig, {
      address: JACKPOT_CONTRACT,
      abi: JACKPOT_ABI,
      functionName: 'getPrizeInfo',
      chainId: activeChain.id,
    });
    return result;
  } catch (error) {
    console.error("Error getting prize info:", error);
    throw error;
  }
}

export async function getPlayerHistory(playerAddress: string) {
  try {
    const result = await readContract(wagmiConfig, {
      address: JACKPOT_CONTRACT,
      abi: JACKPOT_ABI,
      functionName: 'getPlayerSpins',
      args: [playerAddress as `0x${string}`],
      chainId: activeChain.id,
    });
    return result;
  } catch (error) {
    console.error("Error getting player history:", error);
    throw error;
  }
}
```

### Step 4: Update Jackpot Page for Production

Modify `/app/jackpot/page.tsx` to use real contract calls:

```typescript
import { executeSpin, getPlayerHistory } from '@/lib/jackpot';

// In handleSpin function, replace simulation with:
const handleSpin = async (): Promise<number> => {
  if (!isConnected || !address) {
    alert('Please connect your wallet first!');
    throw new Error('Wallet not connected');
  }

  setIsSpinning(true);
  setShowResult(false);

  try {
    // Execute spin on-chain
    const prizeIndex = await executeSpin(address);
    
    // ... rest of the logic
    return prizeIndex;
  } catch (error) {
    console.error('Spin error:', error);
    setIsSpinning(false);
    throw error;
  }
};
```

### Step 5: Test the Implementation

#### Testing on Base Sepolia:

1. **Get Testnet Tokens:**
   - Get Base Sepolia ETH from [Coinbase Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
   - Get testnet $TRIV tokens (mint from contract owner)

2. **Test Workflow:**
   ```bash
   # Start development server
   npm run dev
   
   # Navigate to http://localhost:3000/jackpot
   # Connect wallet
   # Click "How It Works" to see info modal
   # Click SPIN button to execute a spin
   # Verify prize display and statistics
   ```

3. **Verify On-Chain:**
   - Check transaction on [Base Sepolia Explorer](https://sepolia.basescan.org/)
   - Verify event logs for SpinExecuted events
   - Check player history matches UI

### Step 6: Upgrade to Chainlink VRF (Production)

For production deployment, upgrade to Chainlink VRF for true verifiable randomness:

#### Install Chainlink Contracts:
```bash
npm install @chainlink/contracts
```

#### Update Contract:
```solidity
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

contract TriviaJackpotVRF is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface COORDINATOR;
    
    uint64 s_subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 100000;
    uint16 requestConfirmations = 3;
    uint32 numWords = 1;
    
    mapping(uint256 => address) public requestIdToPlayer;
    
    constructor(
        uint64 subscriptionId,
        address vrfCoordinator,
        bytes32 _keyHash
    ) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
        keyHash = _keyHash;
        owner = msg.sender;
        operator = msg.sender;
    }
    
    function spin(address player) external onlyOperator returns (uint256) {
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );
        
        requestIdToPlayer[requestId] = player;
        return requestId;
    }
    
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        address player = requestIdToPlayer[requestId];
        uint256 prize = _determinePrize(randomWords[0]);
        
        // Record and emit results
        // ... rest of the logic
    }
}
```

#### Chainlink VRF Setup:
1. Get LINK tokens
2. Create VRF subscription at [vrf.chain.link](https://vrf.chain.link)
3. Fund subscription with LINK
4. Add contract as consumer
5. Deploy with VRF coordinator address

**Base Mainnet VRF Config:**
```
VRF Coordinator: 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634
Key Hash: 0x...
```

## Security Considerations

1. **Access Control:**
   - Only operator can execute spins
   - Owner can update critical parameters
   - Consider using OpenZeppelin's AccessControl

2. **Randomness:**
   - Current implementation uses pseudo-random
   - Upgrade to Chainlink VRF for production
   - Never expose seeds or randomness sources

3. **Funding:**
   - Ensure jackpot pool has sufficient $TRIV
   - Implement safety checks for payouts
   - Add emergency pause functionality

4. **Rate Limiting:**
   - Consider adding cooldown between spins
   - Implement maximum spins per user per day
   - Add gas optimization for bulk operations

## Future Enhancements

1. **Leaderboard:**
   - Track biggest winners
   - Display recent jackpot winners
   - Implement season-based rankings

2. **Multipliers:**
   - Add streak bonuses
   - Implement special event multipliers
   - Create VIP tiers based on T Points

3. **Social Features:**
   - Share wins on Farcaster
   - Create referral rewards
   - Add team/guild jackpots

4. **Analytics:**
   - Track RTP (Return to Player)
   - Monitor prize distribution
   - Implement anti-abuse measures

## Troubleshooting

### Common Issues:

1. **Wallet Not Connecting:**
   - Check WalletConnect project ID
   - Verify network configuration
   - Ensure wallet has Base network added

2. **Spin Fails:**
   - Check $TRIV token approval
   - Verify sufficient gas
   - Ensure contract is not paused

3. **Prize Not Showing:**
   - Check event logs on block explorer
   - Verify contract read permissions
   - Refresh page to sync state

4. **Animation Issues:**
   - Clear browser cache
   - Check canvas support
   - Verify CSS animations enabled

## Support

For issues or questions:
- GitHub Issues: [repository issues page]
- Discord: [community server]
- Documentation: This guide

## License

MIT License - Free to use and modify

---

**Implementation Status:** ✅ Complete (Demo Mode)

**Production Ready:** ⚠️ Requires Chainlink VRF integration and $TRIV token contract integration

**Last Updated:** 2025-01-09
