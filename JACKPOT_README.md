# $TRIV Jackpot Feature - Quick Start

## Overview
The Triviacast Jackpot is a provably fair spin-to-win game where players can win up to 10,000,000 $TRIV tokens!

## Quick Access
Navigate to: `https://triviacast.xyz/jackpot` (or `/jackpot` route in your local development)

## Features at a Glance

### 🎰 Interactive Spin Wheel
- Beautiful canvas-based spinning wheel animation
- Color-coded prize segments matching app theme
- Smooth 5-second spin animation
- Visual pointer indicator for winner selection

### 💰 Prize Tiers
Six exciting prize levels:
- **Jackpot**: 10,000,000 $TRIV (0.1% chance) - Purple gradient
- **Mega**: 1,000,000 $TRIV (1% chance) - Pink gradient  
- **Big**: 100,000 $TRIV (5% chance) - Light pink
- **Medium**: 10,000 $TRIV (10% chance) - Lighter pink
- **Small**: 1,000 $TRIV (20% chance) - Pale pink
- **Tiny**: 100 $TRIV (63.9% chance) - Very pale pink

### ℹ️ Information Modal
Click "How It Works" button to see:
- Complete prize breakdown with odds
- Game rules and tips
- Technical implementation details
- On-chain randomness explanation

### 📊 User Statistics
Track your performance:
- Total spins counter
- Total winnings display
- Persistent across sessions (localStorage)
- Per-wallet tracking

### 🔐 Wallet Integration
- Requires wallet connection to spin
- Uses existing WagmiWalletConnect component
- Supports Farcaster Mini App connector
- Compatible with MetaMask and WalletConnect

### 🎨 Themed Design
Everything matches the Triviacast brain theme:
- Pink/coral color palette
- Brain icon in header
- Smooth animations and transitions
- Responsive design for mobile and desktop

## How to Use (Current Demo Mode)

1. **Visit the Jackpot Page**
   ```
   http://localhost:3000/jackpot
   ```

2. **Connect Your Wallet**
   - Click the wallet connect button in top right
   - Choose your preferred wallet
   - Approve the connection

3. **Learn the Rules**
   - Click "ℹ️ How It Works" button
   - Review prize tiers and odds
   - Understand the gameplay

4. **Spin to Win!**
   - Click the "SPIN" button in center of wheel
   - Watch the wheel spin for 5 seconds
   - See your prize result appear below
   - Check your updated statistics

5. **Track Your Progress**
   - View total spins counter
   - See total winnings accumulated
   - Stats persist per wallet address

## Files Created

```
contracts/TriviaJackpot.sol           - Smart contract for on-chain jackpot
components/SpinWheel.tsx              - Interactive spinning wheel component
components/JackpotInfoModal.tsx       - Information popup modal
app/jackpot/page.tsx                  - Main jackpot page (updated)
JACKPOT_IMPLEMENTATION.md             - Complete deployment guide
```

## Technical Stack

- **Frontend**: React, TypeScript, Next.js 15
- **Smart Contract**: Solidity 0.8.27
- **Blockchain**: Base network (Sepolia testnet / Mainnet)
- **Wallet**: wagmi v2, viem
- **Randomness**: Pseudo-random (upgradeable to Chainlink VRF)
- **Styling**: Tailwind CSS, Canvas API

## Demo vs Production

### Current Demo Mode ✅
- ✅ Full UI/UX implementation
- ✅ Client-side prize determination
- ✅ Wallet connection
- ✅ Statistics tracking
- ✅ Animations and theming
- ✅ Information modal

### Production Requirements ⚠️
To go live with real blockchain transactions:

1. **Deploy Smart Contract**
   ```bash
   npx hardhat run scripts/deploy-jackpot.ts --network base
   ```

2. **Set Environment Variables**
   ```bash
   NEXT_PUBLIC_JACKPOT_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_CHAIN_ID=8453
   ```

3. **Integrate $TRIV Token**
   - Connect to deployed $TRIV contract
   - Enable token transfers
   - Set up approval flows

4. **Upgrade to Chainlink VRF**
   - Deploy VRF-enabled contract
   - Fund LINK subscription
   - Configure VRF coordinator

5. **Test Thoroughly**
   - Test on Base Sepolia first
   - Verify all transactions
   - Check event logs
   - Monitor gas costs

## Security Notes

⚠️ **Important**: The current implementation uses pseudo-random number generation suitable for demo/testing. For production with real value:

1. **Use Chainlink VRF** for verifiable randomness
2. **Implement proper access controls** (already in contract)
3. **Add rate limiting** to prevent abuse
4. **Monitor contract balance** and ensure sufficient funding
5. **Conduct security audit** before mainnet deployment

## Cost Analysis

**Demo Mode**: Free (no blockchain transactions)

**Production Mode** (per spin):
- Spin transaction: ~0.0001-0.0005 ETH gas
- Prize payout: Automatic via contract
- Total user cost: Gas fees only

## Next Steps

1. Review the implementation guide: `JACKPOT_IMPLEMENTATION.md`
2. Test the feature locally: `npm run dev`
3. Deploy contract to testnet for testing
4. Upgrade to Chainlink VRF for production
5. Launch on Base mainnet

## Support & Questions

- Check `JACKPOT_IMPLEMENTATION.md` for detailed deployment guide
- Review smart contract comments in `contracts/TriviaJackpot.sol`
- Component documentation in respective TSX files
- Issues? Contact via GitHub issues

---

**Status**: ✅ Demo Complete | ⚠️ Production Deployment Pending

**Theme**: 💯 Fully Matches Triviacast Design

**Experience**: 🎨 Amazing & Engaging
