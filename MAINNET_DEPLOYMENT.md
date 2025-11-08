# Base Mainnet Deployment Summary

**Deployment Date**: October 10, 2025  
**Network**: Base Mainnet (Chain ID: 8453)  
**Deployer**: `0x7F06Dd489a086fAC3d4AD64873f6e3Db4cb73fd5`

---

## 📋 Deployed Contracts

### 1. TriviaPoints Contract
**Purpose**: On-chain storage for player T points

- **Address**: `0x781158C06D333b31a58D42DF5eBB5872B0734cD5`
- **BaseScan**: https://basescan.org/address/0x781158C06D333b31a58D42DF5eBB5872B0734cD5
- **Functions**:
  - `addPoints(address wallet, uint256 amount)` - Award points
  - `getPoints(address wallet)` - Read wallet's points
  - `getLeaderboard(uint256 limit)` - Get top players
  - `getTotalWallets()` - Count participating wallets

### 2. TriviacastDistributor Contract
**Purpose**: Manages $TRIV token airdrops and daily claims

- **Address**: `0x380beE8741AAa18252Eb6640760337B4c4aA65b5`
- **BaseScan**: https://basescan.org/address/0x380beE8741AAa18252Eb6640760337B4c4aA65b5
- **Configuration**:
  - Daily claim amount: `0.05 $TRIV` (50000000000000000 wei)
  - Top 5 airdrop: `0.50 $TRIV` per wallet (500000000000000000 wei)
  - Connected to TriviaPoints: `0x781158C06D333b31a58D42DF5eBB5872B0734cD5`
  - Uses $TRIV token: `0x73385Ee7392C105d5898048F96a1bDF551B2D936`

### 3. $TRIV Token (Existing)
**Purpose**: ERC20 reward token for airdrops

- **Address**: `0x73385Ee7392C105d5898048F96a1bDF551B2D936`
- **BaseScan**: https://basescan.org/address/0x73385Ee7392C105d5898048F96a1bDF551B2D936

---

## 🚀 Next Steps

### 1. Fund the Distributor Contract
The distributor needs $TRIV tokens to pay out rewards:

```
Transfer $TRIV tokens to: 0x380beE8741AAa18252Eb6640760337B4c4aA65b5
```

**Recommended initial funding**:
- For 100 daily claims: 5 $TRIV
- For 20 top-5 airdrops: 10 $TRIV
- **Total**: ~15-20 $TRIV to start

### 2. Update Vercel Environment Variables

Go to your Vercel project settings and add:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x781158C06D333b31a58D42DF5eBB5872B0734cD5
NEXT_PUBLIC_CHAIN_ID=8453
```

### 3. Configure WalletConnect

Set your WalletConnect project ID and RPC URL (Base mainnet preferred):
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_RPC_URL=https://base-mainnet.infura.io/v3/your_key
```

### 4. Deploy Your App

After updating Vercel environment variables:
```bash
git add .
git commit -m "Add mainnet contract configuration"
git push
```

Vercel will automatically redeploy with the mainnet contracts.

---

## 📊 How It Works

### Points Flow
1. User completes quiz → App awards T points
2. Points saved to localStorage (instant)
3. Points synced to blockchain TriviaPoints contract
4. Leaderboard reads from blockchain

### Airdrop Flow
1. Admin calls `airdrop_top5.ts` script
2. Script reads leaderboard from TriviaPoints contract
3. Calls TriviacastDistributor to send $TRIV to top 5 players
4. Players receive $TRIV tokens in their wallets

### Daily Claims
Players can claim daily $TRIV rewards:
```typescript
// In your app, add a "Claim Daily Reward" button
const distributor = getContract({
  address: "0x380beE8741AAa18252Eb6640760337B4c4aA65b5",
  chain: base,
});
await distributor.call("claimDaily", []);
```

---

## 🛠️ Admin Commands

### Check Contract Balance
```bash
cd hardhat
npx hardhat run scripts/check-balance.ts --network base
```

### Airdrop to Top 5 Players
```bash
cd hardhat
npm run airdrop:top5:base
```

### Verify Contracts on BaseScan
```bash
cd hardhat
npx hardhat verify --network base 0x781158C06D333b31a58D42DF5eBB5872B0734cD5
npx hardhat verify --network base 0x380beE8741AAa18252Eb6640760337B4c4aA65b5 \
  "0x7F06Dd489a086fAC3d4AD64873f6e3Db4cb73fd5" \
  "0x73385Ee7392C105d5898048F96a1bDF551B2D936" \
  "0x781158C06D333b31a58D42DF5eBB5872B0734cD5" \
  "50000000000000000" \
  "500000000000000000"
```

---

## 📝 Notes

- All contracts are on **Base Mainnet** (production)
- Deployer address owns both contracts
- Contracts use OpenZeppelin standards for security
- Gas costs are minimal on Base (~$0.01-0.10 per transaction)

---

## 🔗 Quick Links

- **TriviaPoints Contract**: https://basescan.org/address/0x781158C06D333b31a58D42DF5eBB5872B0734cD5
- **Distributor Contract**: https://basescan.org/address/0x380beE8741AAa18252Eb6640760337B4c4aA65b5
- **$TRIV Token**: https://basescan.org/address/0x73385Ee7392C105d5898048F96a1bDF551B2D936
- **Base Bridge**: https://bridge.base.org/
- **BaseScan**: https://basescan.org/
