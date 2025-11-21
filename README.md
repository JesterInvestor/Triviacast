### Quiz results messaging

The component `components/QuizResults.tsx` shows tiered, Farcaster-flavored messages based on the user's score:

- 100%: "Perfect frame flip" flex line
- 90–99%: DWR/"onchain brain" quip
- 80–89%: "Certified Frame Lord"
- 60–79%: "Cast-worthy" encouragement
- 40–59%: "Starter pack energy"
- 20–39%: "Feed scrolled" gentle nudge
- <20%: "Rugged by trivia" jab
- Special case: exactly 1000 T Points (≈1 correct): harsh-but-funny "one lonely warp" line

Adjust copy in `getResultMessage()` if tone needs to change.

[![Tip in Crypto](https://tip.md/badge.svg)](https://tip.md/jesterinvestor)
# Quiz Challenge - Farcaster Trivia App

A Next.js-based trivia quiz mini-game that encourages users to answer questions in a timed format. Built for Farcaster with wallet connection via WalletConnect and wagmi.

## Features

- **Timed Quiz Format**: 5-minute quiz with 10 trivia questions
- **Open Trivia Database Integration**: Fetches questions from OpenTDB API
- **Real-time Scoring**: Instant feedback on answers with score tracking
- **T Points & Leaderboard**: Earn points for correct answers with streak bonuses
- **Smart Contract Integration**: Optional blockchain storage for T points (Base Sepolia)
- **Wallet Integration**: wagmi + WalletConnect (with Farcaster Mini App connector)
- **Responsive Design**: Beautiful UI with Tailwind CSS
- **Farcaster Mini App**: Full Mini App SDK integration with ready() call
- **Vercel Deployment**: Optimized for deployment on Vercel

Note: The platform's native coin is $TRIV (contract: `0x73385Ee7392C105d5898048F96a1bDF551B2D936`). At launch, $TRIV will be airdropped to top users on the leaderboard; eligibility details will be announced separately.

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- A WalletConnect Project ID (get one at https://cloud.walletconnect.com)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/JesterInvestor/Quiz.git
cd Quiz
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file based on `.env.example`:
```bash
cp .env.example .env.local
```

4. Add your environment variables to `.env.local`:
```
# Triviacast

Triviacast is a Farcaster-focused trivia mini-app built with Next.js and TypeScript. Players answer timed multiple-choice questions, earn "T Points", and can optionally persist scores on-chain. The app integrates with Farcaster Mini App SDK and wallet providers (wagmi + WalletConnect).

Key ideas:
- Fast, mobile-first trivia experience as a Farcaster Mini App
- Wallet-connected points and leaderboard with optional smart-contract persistence
- Mix of OpenTDB-sourced and curated Farcaster questions

---

## Table of contents
- [Features](#features)
- [Quick start](#quick-start)
- [Environment / Configuration](#environment--configuration)
- [Architecture & Key files](#architecture--key-files)
- [Smart contracts](#smart-contracts)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Timed quiz gameplay (configurable questions/time)
- Question sources: Open Trivia Database (OpenTDB) + curated local `data/farcaster_questions.json`
- Real-time scoring, streak bonuses, and T Points balance
- Wallet integration via `wagmi` and WalletConnect (Farcaster Mini App connector supported)
- Optional on-chain storage of points via `TriviaPoints.sol` (Base Sepolia by default)
- Leaderboard for top wallets
- Responsive UI built with Tailwind CSS and Next.js App Router

---

## Quick start

Requirements
- Node.js 18+ and npm (or yarn)

Local development
1. Clone the repo:

```powershell
git clone https://github.com/JesterInvestor/Triviacast.git
cd Triviacast
```

2. Install dependencies:

```powershell
npm install
```

3. Create `.env.local` (see the Environment section below for keys):

```powershell
copy .env.example .env.local
```

4. Start dev server:

```powershell
npm run dev
```

Open: http://localhost:3000

Run the production build locally:

```powershell
npm run build; npm run start
```

---

## Environment / Configuration

Essential env vars (set in `.env.local` or CI/Vercel):

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — WalletConnect Cloud project ID (required for WalletConnect)
- `NEXT_PUBLIC_RPC_URL` — RPC endpoint used for optional on-chain features
- `NEXT_PUBLIC_CONTRACT_ADDRESS` — Optional: deployed `TriviaPoints` contract address
- `NEXT_PUBLIC_CHAIN_ID` — Optional chain id for the contract (e.g., Base Sepolia)

Optional keys used by features (jackpot, spins, etc.) are documented in the repo docs (`SMART_CONTRACT_INTEGRATION.md`, `WAGMI_INTEGRATION.md`).

---

## Architecture & Key files

- `app/` - Next.js App Router pages and API routes
   - `app/api/questions/route.ts` - server API fetching and normalizing questions
- `components/` - React UI components and providers (Quiz, Timer, Leaderboard, Wallet integration)
- `lib/` - helper libraries: contract interactions, tpoints logic, wagmi configuration
- `contracts/` - Solidity contracts (`TriviaPoints.sol`, `Jackpot.sol`)
- `data/` - curated local questions (`farcaster_questions.json`)
- `hardhat/` - Hardhat project for compiling/deploying contracts

Use these files as entry points when you need to change behavior or wire new features.

---

## Smart contracts

This project optionally persists points on-chain via `TriviaPoints.sol`. Smart-contract related files are in `contracts/` and the Hardhat deployment helpers are under `hardhat/`.

See `SMART_CONTRACT_INTEGRATION.md` for:
- deployment steps
- required env variables for Hardhat scripts
- how the frontend toggles between local storage and on-chain storage

---

## Deployment

Recommended: Vercel (App Router ready). On Vercel, add the same environment variables you use locally.

Steps:
1. Push to GitHub
2. Import repository in Vercel
3. Add env vars in the project settings
4. Deploy

CI / other platforms: ensure `NEXT_PUBLIC_*` variables are available at build time.

---

## Contributing

Contributions are welcome. Good first steps:
- Run the app locally and explore the `components/Quiz*` components
- Add or refine questions in `data/farcaster_questions.json`
- Improve tests (if you add features, include tests)

Please open issues or PRs against the `main` branch. Follow the repo's existing style (TypeScript, Tailwind, no trailing semicolons where project style avoids them).

---

## Jackpot (x402)

This repo includes a simple TRIV jackpot feature protected by x402 payments. Key points:
- Endpoint: `POST /api/jackpot` — costs `0.10 USDC` per spin and is protected by x402 middleware in `middleware.ts`.
- Metadata: `GET /api/jackpot` returns `{ jackpot: 10000000, price: "$0.10" }`.
- UI: `components/Jackpot.tsx` provides a client-side spin button which attempts to use `x402-fetch` + `wagmi/actions#getWalletClient` when available, and falls back to a plain fetch.
- Logs: spin attempts are appended to `data/jackpot_log.json` (local filesystem — in production replace with persistent storage or on-chain payouts).
- Chance to win full jackpot: **25% per spin** (implementation uses a 1-in-4 random check).

Environment vars required for x402 integration (see docs/CDP.md for more):
- `RESOURCE_WALLET_ADDRESS` — wallet that receives USDC payments
- `NETWORK` — e.g., `base-sepolia` for testing or `base` for mainnet
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY` — OnchainKit API key (optional for advanced flows)

Note: This is a starter implementation. For real payouts you should implement secure server-side settlement, on-chain transfers (or third-party custodial settlement), and thorough testing on testnet.

## Suggested next steps (after this README)

- Run `npm run build` and verify production output
- If you use the blockchain features, follow `SMART_CONTRACT_INTEGRATION.md` to deploy contracts and update env vars
- Add a short CONTRIBUTING.md if you expect external contributors

---

## License

MIT

---

If you'd like, I can also:
- add a `CONTRIBUTING.md` with developer setup
- generate a trimmed `README` tailored for a GitHub repo front page (shorter intro + badges)
│   │   └── page.tsx              # Leaderboard page

│   ├── layout.tsx                # Root layout with providers

