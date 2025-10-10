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
