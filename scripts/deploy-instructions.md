# Smart Contract Deployment Instructions

This guide provides step-by-step instructions for deploying the TriviaPoints smart contract.

## Prerequisites

Before deploying, ensure you have:

1. **MetaMask or compatible wallet** installed and configured
2. **Test ETH on Base Sepolia** testnet
   - Get Sepolia ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
   - Bridge to Base Sepolia at [Base Bridge](https://bridge.base.org/)
3. **Base Sepolia network** added to MetaMask:
   - Network Name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency Symbol: `ETH`
   - Block Explorer: `https://sepolia.basescan.org`

## Deployment Methods

### Method 1: Deploy via Remix IDE (Recommended)

This is the easiest method for beginners and testing.

#### Steps:

1. **Open Remix IDE**
   - Go to [https://remix.ethereum.org/](https://remix.ethereum.org/)

2. **Create New File**
   - In the File Explorer, click the "+" icon
   - Name it `TriviaPoints.sol`

3. **Copy Contract Code**
   - Copy the entire content from `contracts/TriviaPoints.sol`
   - Paste it into the newly created file in Remix

4. **Compile Contract**
   - Click on "Solidity Compiler" tab (left sidebar)
   - Select compiler version: `0.8.27`
   - Click "Compile TriviaPoints.sol"
   - Ensure compilation succeeds with no errors

5. **Deploy Contract**
   - Click on "Deploy & Run Transactions" tab
   - Environment: Select "Injected Provider - MetaMask"
   - MetaMask will prompt to connect - approve the connection
   - Ensure you're on Base Sepolia network in MetaMask
   - Click "Deploy" button
   - Confirm the transaction in MetaMask

6. **Verify Deployment**
   - Once deployed, you'll see the contract address in the "Deployed Contracts" section
   - Copy this address - you'll need it for the app configuration
   - Click on the contract to expand and test functions

7. **Test Contract (Optional)**
   - Try calling `getTotalWallets()` - should return 0
   - Try `addPoints` with your address and some points
   - Call `getPoints` with your address to verify

#### Save Your Contract Address

After deployment, save the contract address:

```
Contract Address: 0x... (your deployed address)
Network: Base Sepolia
Chain ID: 84532
Deployed By: (your wallet address)
Block: (deployment block number)
```

### Method 2: Deploy via thirdweb

thirdweb provides a user-friendly interface for contract deployment.

#### Steps:

1. **Go to thirdweb Deploy**
   - Visit [https://thirdweb.com/deploy](https://thirdweb.com/deploy)

2. **Upload Contract**
   - Click "Deploy Contract"
   - Upload `contracts/TriviaPoints.sol` file
   - Or paste the contract code directly

3. **Configure Deployment**
   - Select network: "Base Sepolia Testnet"
   - Review contract details
   - Click "Deploy Now"

4. **Connect Wallet**
   - Connect your MetaMask wallet
   - Ensure you're on Base Sepolia network
   - Approve the deployment transaction

5. **Complete Deployment**
   - Wait for transaction confirmation
   - Copy the deployed contract address
   - thirdweb will provide a dashboard to interact with your contract

### Method 3: Deploy with Hardhat (Advanced)

For developers familiar with Hardhat, you can set up a complete deployment pipeline.

#### Steps:

1. **Install Dependencies** (in a separate directory to avoid Next.js conflicts)
   ```bash
   mkdir hardhat-deployment
   cd hardhat-deployment
   npm init -y
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox ethers
   ```

2. **Initialize Hardhat**
   ```bash
   npx hardhat init
   ```
   - Choose "Create a TypeScript project"
   - Accept default options

3. **Configure hardhat.config.ts**
   ```typescript
   import { HardhatUserConfig } from "hardhat/config";
   import "@nomicfoundation/hardhat-toolbox";
   
   const config: HardhatUserConfig = {
     solidity: "0.8.27",
     networks: {
       baseSepolia: {
         url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
         accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
       },
     },
   };
   
   export default config;
   ```

4. **Copy Contract**
   - Copy `TriviaPoints.sol` to `contracts/` directory

5. **Create Deployment Script**
   Create `scripts/deploy.ts`:
   ```typescript
   import { ethers } from "hardhat";
   
   async function main() {
     const TriviaPoints = await ethers.getContractFactory("TriviaPoints");
     const triviaPoints = await TriviaPoints.deploy();
     await triviaPoints.waitForDeployment();
     
     const address = await triviaPoints.getAddress();
     console.log("TriviaPoints deployed to:", address);
   }
   
   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

6. **Set Environment Variables**
   Create `.env`:
   ```
   PRIVATE_KEY=your_wallet_private_key
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   ```

7. **Deploy**
   ```bash
   npx hardhat run scripts/deploy.ts --network baseSepolia
   ```

## After Deployment

### 1. Configure Your App

Add the contract address to your app's `.env.local`:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Your deployed address
NEXT_PUBLIC_CHAIN_ID=84532
```

### 2. Verify Contract (Optional but Recommended)

Verify your contract on BaseScan for transparency:

1. Go to [Base Sepolia Explorer](https://sepolia.basescan.org)
2. Search for your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Fill in details:
   - Compiler Type: Solidity (Single file)
   - Compiler Version: v0.8.27
   - License: MIT
6. Paste your contract code
7. Submit for verification

### 3. Test Integration

1. **Start your app**: `npm run dev`
2. **Connect wallet**: Click "Connect Wallet" and connect to Base Sepolia
3. **Complete a quiz**: Answer questions and finish the quiz
4. **Check transaction**: You should see "Points saved to blockchain!"
5. **Verify on chain**:
   - Go to BaseScan
   - Search your contract address
   - Check "Events" tab for `PointsAdded` events
6. **Check leaderboard**: Visit the leaderboard page to see blockchain data

### 4. Grant Access (Optional)

If you want others to be able to update points:

```solidity
// Only the contract owner can do this
contract.transferOwnership(newOwnerAddress);
```

## Troubleshooting

### Issue: "Insufficient funds for gas"
**Solution**: Get more test ETH from the faucet

### Issue: "Transaction failed"
**Solution**: Check you're on the correct network (Base Sepolia)

### Issue: "Contract not found"
**Solution**: Wait 10-30 seconds for transaction confirmation

### Issue: "Wrong network"
**Solution**: Switch MetaMask to Base Sepolia network

## Gas Costs (Approximate)

- **Deployment**: ~1,500,000 gas (~$0.15 on Base Sepolia)
- **Add Points**: ~50,000 gas (~$0.005 on Base Sepolia)
- **Get Points**: Free (read-only)
- **Get Leaderboard**: Free (read-only)

Note: These are estimates for Base Sepolia testnet. Mainnet costs will vary.

## Production Deployment

For deploying to mainnet (Base or other chains):

1. **Get Mainnet ETH**: You'll need real ETH for gas
2. **Update Network**: Change network in deployment config
3. **Test Thoroughly**: Test on testnet first
4. **Verify Contract**: Always verify on block explorer
5. **Secure Private Key**: Never commit private keys to git
6. **Consider Multisig**: Use multisig wallet for contract ownership
7. **Audit Contract**: Consider professional audit for mainnet

## Support

If you encounter issues:

1. Check the [SMART_CONTRACT_INTEGRATION.md](../SMART_CONTRACT_INTEGRATION.md)
2. Review [contracts/README.md](../contracts/README.md)
3. Verify transaction on [Base Sepolia Explorer](https://sepolia.basescan.org)
4. Check browser console for error messages
5. Open an issue on GitHub with deployment logs

## Security Notes

- ✅ Never share your private key
- ✅ Only deploy on testnet for testing
- ✅ Verify contract code on block explorer
- ✅ Test all functions before mainnet deployment
- ✅ Keep backup of contract address and deployment details
- ⚠️ The contract owner has special privileges (can update points)
- 💡 Consider transferring ownership to a multisig for production

## Next Steps

After successful deployment:

1. ✅ Save contract address securely
2. ✅ Update `.env.local` with contract address
3. ✅ Test app integration
4. ✅ Verify contract on BaseScan
5. ✅ Document deployment details
6. ✅ Monitor contract events
7. ✅ Plan for mainnet deployment (if applicable)
