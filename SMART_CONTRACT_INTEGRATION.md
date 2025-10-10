# Smart Contract Integration Guide

This document explains the smart contract functionality implementation for managing T points in Triviacast.

## Overview

The Triviacast app now includes smart contract functionality to store and manage T points on the blockchain. The implementation includes:

1. **Solidity Smart Contract** (`contracts/TriviaPoints.sol`) - Manages T points on-chain
2. **Contract Integration Library** (`lib/contract.ts`) - Handles blockchain interactions
3. **Updated T Points Library** (`lib/tpoints.ts`) - Integrates contract with existing code
4. **Enhanced UI Components** - Display wallet points and leaderboard from blockchain

## Features

### Smart Contract Features

- ✅ **Add Points**: Any user can add points to their wallet address
- ✅ **Get Points**: Read total points for any wallet
- ✅ **Leaderboard**: Get top wallets sorted by points
- ✅ **Owner Functions**: Contract owner can update points directly
- ✅ **Event Logging**: All point changes emit events for tracking

### App Integration Features

- ✅ **Automatic Sync**: Points automatically sync to blockchain after quiz completion
- ✅ **Fallback Support**: Uses localStorage if contract not configured
- ✅ **Error Handling**: Graceful fallback if blockchain transactions fail
- ✅ **Loading States**: UI feedback during blockchain operations
- ✅ **Real-time Updates**: Leaderboard fetches from blockchain

## Architecture

### Data Flow

```
Quiz Completion → Calculate Points → Save to localStorage → Save to Blockchain
                                              ↓
                                        Update Leaderboard
```

### Hybrid Storage Approach

The app uses a **hybrid storage approach** for reliability:

1. **Primary**: Blockchain (if contract is configured)
2. **Fallback**: localStorage (if contract unavailable or transaction fails)

This ensures the app works even without blockchain configuration and provides resilience against network issues.

## Setup Instructions

### Step 1: Deploy the Smart Contract

Choose one of these methods:

#### Option A: Deploy via Remix IDE (Easiest)

1. Go to [Remix IDE](https://remix.ethereum.org/)
2. Create a new file `TriviaPoints.sol`
3. Copy the contract code from `contracts/TriviaPoints.sol`
4. Compile with Solidity 0.8.27
5. Connect MetaMask to Base Sepolia testnet
6. Deploy the contract
7. Copy the deployed contract address

#### Option B: Deploy via thirdweb

1. Go to [thirdweb Deploy](https://thirdweb.com/deploy)
2. Upload `contracts/TriviaPoints.sol`
3. Select Base Sepolia (Chain ID: 84532)
4. Deploy and copy the address

### Step 2: Configure Environment Variables

Create a `.env.local` file (or update existing one):

```bash
# Required for wallet connection
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id

# Smart contract configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Your deployed contract address
NEXT_PUBLIC_CHAIN_ID=84532 # Base Sepolia
```

### Step 3: Get Testnet ETH

To interact with the smart contract on Base Sepolia, you need testnet ETH:

1. Get Sepolia ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
2. Bridge to Base Sepolia using [Base Bridge](https://bridge.base.org/)

### Step 4: Test the Integration

1. Start the development server: `npm run dev`
2. Connect your wallet
3. Complete a quiz
4. Points should be saved to blockchain (you'll see confirmation message)
5. Check leaderboard - it should fetch from blockchain

## Testing

### Manual Testing Checklist

- [ ] Contract deploys successfully
- [ ] Can connect wallet to app
- [ ] Quiz completion saves points to localStorage
- [ ] Quiz completion triggers blockchain transaction
- [ ] Transaction confirmation message appears
- [ ] Wallet points display updates after transaction
- [ ] Leaderboard fetches from blockchain
- [ ] App works without contract configuration (localStorage fallback)
- [ ] App handles failed transactions gracefully

### Testing Without Contract

The app works perfectly fine without a deployed contract:

1. Don't set `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local`
2. App will use localStorage only
3. All features work, just without blockchain persistence

### Testing Contract Interactions

You can test contract functions directly on Base Sepolia block explorer:

1. Go to [Base Sepolia Explorer](https://sepolia.basescan.org)
2. Enter your contract address
3. Go to "Contract" → "Read Contract" to view points and leaderboard
4. Go to "Contract" → "Write Contract" to add points (must connect wallet)

## Code Structure

### Smart Contract (`contracts/TriviaPoints.sol`)

```solidity
contract TriviaPoints {
    mapping(address => uint256) private tPoints;
    address[] private wallets;
    
    function addPoints(address wallet, uint256 amount) external;
    function getPoints(address wallet) external view returns (uint256);
    function getLeaderboard(uint256 limit) external view returns (...);
}
```

### Integration Library (`lib/contract.ts`)

```typescript
// Main functions
export async function addPointsOnChain(account, walletAddress, points);
export async function getPointsFromChain(walletAddress);
export async function getLeaderboardFromChain(limit);
export function isContractConfigured();
```

### Updated Functions (`lib/tpoints.ts`)

```typescript
// Now async and blockchain-aware
export async function getWalletTotalPoints(walletAddress): Promise<number>;
export async function getLeaderboard(): Promise<LeaderboardEntry[]>;
export async function addWalletTPoints(walletAddress, points): Promise<number>;
```

## Component Updates

### WalletPoints.tsx

- Now fetches points from blockchain (via contract.ts)
- Falls back to localStorage if contract not configured
- Displays loading state while fetching

### Leaderboard.tsx

- Fetches leaderboard from blockchain
- Falls back to localStorage if contract not configured
- Shows real-time on-chain data

### QuizResults.tsx

- Automatically saves points to blockchain after quiz completion
- Shows transaction status (pending, success, error)
- Handles transaction failures gracefully
- Always saves to localStorage as backup

## Production Deployment

### Mainnet Deployment (Future)

To deploy to mainnet (Base or other chains):

1. Deploy contract to mainnet
2. Update `.env.local` with mainnet contract address
3. Update chain ID in `lib/contract.ts` if using different chain
4. Ensure you have mainnet ETH for transactions
5. Consider gas optimization for production

### Recommended Production Setup

1. **Use Base Mainnet**: Lower gas fees, good for frequent transactions
2. **Contract Ownership**: Transfer ownership to a multisig wallet
3. **Monitoring**: Set up event monitoring for point additions
4. **Backup**: Keep localStorage as fallback for reliability

## Troubleshooting

### Common Issues

**Issue**: "Contract address not configured" error

- **Solution**: Set `NEXT_PUBLIC_CONTRACT_ADDRESS` in `.env.local`
- **Or**: App works fine with localStorage fallback

**Issue**: Transaction fails with "insufficient funds"

- **Solution**: Get testnet ETH from faucet

**Issue**: Points not showing on leaderboard

- **Solution**: Wait for transaction confirmation (can take 10-30 seconds)
- **Solution**: Check transaction on block explorer

**Issue**: "Failed to save points to blockchain"

- **Solution**: Points are still saved to localStorage
- **Solution**: Check wallet connection and network
- **Solution**: Ensure you have testnet ETH for gas

### Debug Mode

Enable debug logging by opening browser console:

- Contract interactions log success/failure
- Points fetching shows blockchain vs localStorage
- Transaction hashes logged for verification

## Future Enhancements

Potential improvements for the smart contract system:

1. **Token Rewards**: Convert T points to ERC-20 tokens
2. **NFT Achievements**: Award NFTs for milestones
3. **Staking**: Allow users to stake T points for benefits
4. **Governance**: Use T points for voting on quiz topics
5. **Cross-chain**: Support multiple chains via bridge
6. **Gas Optimization**: Batch multiple point additions
7. **Social Features**: Add referral bonuses on-chain

## Security Considerations

- ✅ Contract has owner-only functions for admin control
- ✅ Input validation prevents invalid addresses/amounts
- ✅ No reentrancy vulnerabilities (no external calls)
- ✅ Events logged for all state changes
- ⚠️ Leaderboard sorting is on-chain (gas-intensive with many users)
- 💡 Consider off-chain sorting for production with many users

## Support

For questions or issues:

1. Check the [contracts/README.md](contracts/README.md)
2. Review transaction on block explorer
3. Check browser console for error messages
4. Ensure wallet is connected to correct network

## Contract Details

- ## $TRIV Token & Airdrop

- **Native coin**: $TRIV
- **Token contract address**: `0x73385Ee7392C105d5898048F96a1bDF551B2D936`
- **Airdrop**: At launch, $TRIV will be airdropped to top users (top leaderboard wallets). Specific snapshot timing, eligibility thresholds, and distribution amounts will be announced separately.

- ## Contract Details

- **Solidity Version**: 0.8.27
- **License**: MIT
- **Network**: Base Sepolia (testnet)
- **Chain ID**: 84532
- **Gas Costs**: ~50k-100k gas per transaction
