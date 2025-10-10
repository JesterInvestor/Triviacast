# TriviaPoints Smart Contract

## Overview

The `TriviaPoints.sol` contract manages T points for Triviacast users based on their wallet addresses. It provides functionality to:
- Add points to wallet addresses
- Retrieve points for specific wallets
- Get a leaderboard of top wallets sorted by points
- Transfer contract ownership

## Contract Functions

### Public Functions

- `addPoints(address wallet, uint256 amount)`: Add points to a wallet (callable by anyone)
- `getPoints(address wallet)`: Get the total T points for a specific wallet
- `getLeaderboard(uint256 limit)`: Get the top wallets and their points, sorted descending
- `getTotalWallets()`: Get the total number of wallets that have earned points

### Owner-Only Functions

- `updatePoints(address wallet, uint256 newTotal)`: Set exact point total for a wallet
- `transferOwnership(address newOwner)`: Transfer contract ownership

## Deployment Instructions

### Option 1: Deploy via Remix IDE (Recommended for Testing)

1. Go to [Remix IDE](https://remix.ethereum.org/)
2. Create a new file `TriviaPoints.sol` and paste the contract code
3. Compile the contract using Solidity 0.8.27
4. Connect your wallet (MetaMask) to Base Sepolia testnet
5. Deploy the contract
6. Copy the deployed contract address
7. Add the address to `.env.local`:
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x... (your deployed address)
   NEXT_PUBLIC_CHAIN_ID=84532
   ```

### Option 2: Deploy via thirdweb

1. Go to [thirdweb Deploy](https://thirdweb.com/deploy)
2. Upload the `TriviaPoints.sol` contract
3. Configure deployment to Base Sepolia (Chain ID: 84532)
4. Deploy the contract
5. Copy the deployed contract address
6. Add to `.env.local` as above

### Option 3: Deploy with Hardhat (Advanced)

If you want to use Hardhat for deployment:

```bash
# Install dependencies (in a separate directory to avoid conflicts)
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox ethers

# Create hardhat.config.js
npx hardhat init

# Add Base Sepolia network configuration
# Add deployment script
# Deploy: npx hardhat run scripts/deploy.js --network baseSepolia
```

## Base Sepolia Testnet Details

- **Network Name**: Base Sepolia
- **RPC URL**: https://sepolia.base.org
- **Chain ID**: 84532
- **Currency Symbol**: ETH
- **Block Explorer**: https://sepolia.basescan.org

### Get Testnet ETH

1. Get Sepolia ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
2. Bridge to Base Sepolia using [Base Bridge](https://bridge.base.org/)

## After Deployment

1. Note the deployed contract address
2. Add it to your `.env.local` file
3. The app will automatically connect to the contract
4. Test by completing a quiz - points should be saved to the blockchain

## Verification (Optional)

To verify your contract on BaseScan:

1. Go to [Base Sepolia Explorer](https://sepolia.basescan.org)
2. Find your contract address
3. Click "Verify and Publish"
4. Select "Solidity (Single file)"
5. Paste the contract code
6. Compiler version: 0.8.27
7. Optimization: No
8. Submit for verification
