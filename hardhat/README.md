This folder contains Hardhat scripts for managing the Triviacast distributor on Base.

Scripts added
- `hardhat/scripts/set-daily-amount.ts` — sets the distributor `dailyAmount` (owner only). Defaults to 1000 TRIV if `DAILY_AMOUNT` is not provided.
- `hardhat/scripts/fund-distributor.ts` — transfers TRIV tokens from the owner account to the distributor contract. Defaults to 10000 TRIV if `FUND_AMOUNT` is not provided.

Required environment variables
- `PRIVATE_KEY` — owner private key (used by Hardhat to sign txs). Put in `hardhat/.env` or the repo root `.env`.
- `BASE_MAINNET_RPC_URL` — Base mainnet RPC URL (e.g. Alchemy/Infura/QuickNode).
- `DISTRIBUTOR_ADDRESS` — deployed TriviacastDistributor contract address.
- `TRIV_TOKEN` — $TRIV ERC20 token address (defaults to NEXT_PUBLIC_TRIV_ADDRESS if present).

Optional env vars
- `DAILY_AMOUNT` — human amount to set as daily claim (e.g. `1000`). If not set, `set-daily-amount` uses `1000`.
- `FUND_AMOUNT` — human amount of TRIV to send to distributor (e.g. `10000`). Defaults to `10000`.

Examples

1) Verify your balance and network

```powershell
npx hardhat run hardhat/scripts/check-balance.ts --network base
```

2) Set daily amount to 1000 TRIV (recommended)

```powershell
# from repo root; ensure hardhat/.env contains PRIVATE_KEY, BASE_MAINNET_RPC_URL, DISTRIBUTOR_ADDRESS
npx hardhat run hardhat/scripts/set-daily-amount.ts --network base
```

3) Fund the distributor with 10k TRIV

```powershell
npx hardhat run hardhat/scripts/fund-distributor.ts --network base
```

Notes
- These scripts call owner-only functions. Make sure `PRIVATE_KEY` corresponds to the distributor owner.
- `set-daily-amount` writes the raw wei value derived from the provided human amount using 18 decimals.
- After updating the on-chain `dailyAmount`, update the frontend env `NEXT_PUBLIC_DAILY_CLAIM_AMOUNT="1000 $TRIV"` and redeploy your site so the UI shows the correct amount.
# Triviacast Hardhat Deployment

This folder contains a minimal Hardhat setup to compile and deploy `TriviaPoints.sol` to Base Sepolia.

## Prerequisites
- Node.js 18+
- An EOA private key with Base Sepolia ETH
- Base Sepolia RPC URL (defaults to https://sepolia.base.org)

## Setup
1. Copy `.env.example` to `.env` and fill in values:
```
PRIVATE_KEY=your_private_key_without_0x
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=optional_for_verification
```

2. Install dependencies:
```
npm install
```

3. Compile:
```
npm run build
```

## Deploy
```
npm run deploy:base-sepolia
```
You should see the deployed address in the output.

## Verify (optional)
```
npm run verify:base-sepolia -- <DEPLOYED_ADDRESS>
```

## Notes
- The contract source here mirrors `../contracts/TriviaPoints.sol`. If you modify the main contract, copy updates into `hardhat/contracts/TriviaPoints.sol` before compiling.
- For quick testing without local setup, you can deploy via Remix as described in `contracts/README.md`.
