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

- **Multiple Question Sources**: Toggle between General Knowledge (OpenTDB) and Farcaster Knowledge (Local)
- **Timed Quiz Format**: 1-minute quiz with 10 trivia questions
- **Open Trivia Database Integration**: Fetches questions from OpenTDB API
- **Farcaster-Themed Questions**: 100+ curated questions about Farcaster, the protocol, creators, and ecosystem
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
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_RPC_URL=https://base-sepolia.infura.io/v3/...

# Optional: Add smart contract configuration for blockchain storage
# NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
# NEXT_PUBLIC_CHAIN_ID=84532
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Quiz Features

### Question Sources

The quiz supports two question sources that can be toggled before starting a quiz:

1. **General Knowledge (OpenTDB)**: Questions from the Open Trivia Database covering various topics
2. **Farcaster Knowledge (Local)**: Curated questions about Farcaster, the protocol, creators, and ecosystem

To switch between sources, use the toggle on the main quiz page before starting. If you try to switch during an active quiz, you'll be prompted to confirm as it will restart the quiz.

### Timer System
- 1-minute overall time limit for the entire quiz
- Visual timer with color-coded warnings (green → yellow → red)
- Automatic quiz completion when time expires

### Question Display
- Questions fetched from Open Trivia Database or local Farcaster questions
- Multiple choice format with 4 options
- HTML entity decoding for special characters
- Randomized answer order for each question

### Scoring & T Points System
- Real-time score tracking
- Earn 1000 T points per correct answer
- Streak bonuses: 500 points for 3 in a row, 1000 for 5, 2000 for perfect 10!
- Wallet-based point storage (localStorage + optional blockchain)
- Leaderboard tracking top 100 wallets
- Detailed results page with answer review
- Performance feedback based on percentage score
- Visual indicators for correct/incorrect answers

### Adding Custom Questions

You can add your own Farcaster-themed questions by editing `public/data/farcaster_questions.json`. See [docs/QUESTIONS.md](./docs/QUESTIONS.md) for detailed instructions on the question format and best practices.

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Wallet Integration**: wagmi v2 with Farcaster Mini App connector + WalletConnect
- **Blockchain**: Solidity 0.8.27 (Base Sepolia)
- **API**: Open Trivia Database
- **Farcaster SDK**: @farcaster/miniapp-sdk
- **Deployment**: Vercel

## Smart Contract Integration

The app includes optional blockchain functionality for T points storage:

- **Smart Contract**: `TriviaPoints.sol` - Manages points on Base Sepolia testnet
- **Hybrid Storage**: Uses blockchain when configured, falls back to localStorage
- **Automatic Sync**: Points saved to blockchain after each quiz
- **Leaderboard**: Fetches top wallets from smart contract

See [SMART_CONTRACT_INTEGRATION.md](./SMART_CONTRACT_INTEGRATION.md) for detailed setup instructions.

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (required)
   - `NEXT_PUBLIC_RPC_URL` (recommended)
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` (optional - for blockchain storage)
   - `NEXT_PUBLIC_CHAIN_ID` (optional - default: 84532 for Base Sepolia)
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JesterInvestor/Quiz)

## Farcaster Mini App Integration

The app is fully configured as a Farcaster Mini App with:
- **Mini App SDK**: Properly calls `sdk.actions.ready()` to hide the splash screen
- **Wallet Provider**: Uses wagmi with `@farcaster/miniapp-wagmi-connector` for seamless wallet access
- **Manifest**: Configured in `public/farcaster-manifest.json`

To integrate with Farcaster:
1. Deploy your app to a public URL (e.g., Vercel)
2. Update the URLs in `farcaster-manifest.json` with your actual domain
3. Register your miniapp with Farcaster

See [WAGMI_INTEGRATION.md](./WAGMI_INTEGRATION.md) for detailed wagmi setup and usage.

## API Routes

### GET `/api/questions`

Fetches trivia questions from Open Trivia Database or local Farcaster questions.

**Query Parameters:**
- `amount` (default: 10): Number of questions to fetch
- `source` (default: 'opentdb'): Question source ('opentdb' or 'farcaster')
- `difficulty` (optional): Question difficulty (easy, medium, hard) - OpenTDB only
- `category` (optional): Question category ID - OpenTDB only
- `tags` (optional): Comma-separated tags for filtering - Farcaster only

**Examples:**
```
GET /api/questions?amount=10&source=opentdb&difficulty=medium
GET /api/questions?amount=10&source=farcaster&tags=hard,protocol
```

## Project Structure

```
Triviacast/
├── app/
│   ├── api/
│   │   └── questions/
│   │       └── route.ts          # API route for fetching questions
│   ├── leaderboard/
│   │   └── page.tsx              # Leaderboard page
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/
│   ├── Quiz.tsx                  # Main quiz component
│   ├── QuizQuestion.tsx          # Question display component
│   ├── QuizResults.tsx           # Results display component with point saving
│   ├── Timer.tsx                 # Timer component
│   ├── Leaderboard.tsx           # Leaderboard display
│   ├── WalletPoints.tsx          # Wallet points display
│   ├── WagmiProvider.tsx         # wagmi provider wrapper
│   ├── WagmiProvider.tsx         # wagmi provider wrapper
│   ├── WagmiWalletConnect.tsx    # wagmi + WalletConnect connection component
│   └── FarcasterMiniAppReady.tsx # Mini App SDK ready() caller
├── contracts/
│   ├── TriviaPoints.sol          # Smart contract for T points
│   └── README.md                 # Contract deployment guide
├── lib/
│   ├── contract.ts               # Blockchain interaction functions
│   ├── tpoints.ts                # T points calculation and storage
│   └── wagmi.ts                  # wagmi configuration with Farcaster & WalletConnect
├── types/
│   └── quiz.ts                   # TypeScript type definitions
├── public/
│   └── farcaster-manifest.json   # Farcaster configuration
├── .env.example                  # Environment variables template
├── SMART_CONTRACT_INTEGRATION.md # Smart contract setup guide
├── WAGMI_INTEGRATION.md          # wagmi setup and usage guide
└── FARCASTER.md                  # Farcaster Mini App documentation
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Environment Configuration

### Daily Claim Amount

You can customize the daily claim display text via environment variables:

1. Preferred: set a single combined label
```
NEXT_PUBLIC_DAILY_CLAIM_AMOUNT=50,000 $TRIV
```
2. Or set value + units separately (they are concatenated):
```
NEXT_PUBLIC_DAILY_CLAIM_AMOUNT_VALUE=50000
NEXT_PUBLIC_DAILY_CLAIM_AMOUNT_UNITS=$TRIV
```
Format the value exactly as you want it to appear (e.g. include commas). Leading/trailing spaces are trimmed automatically.

If none are set the UI falls back to `100,000 $TRIV`.

### Jackpot / VRF / Prepaid Spins

Add these variables to `.env.local` (and to Vercel project settings) to enable the on-chain Jackpot page flow:

```
NEXT_PUBLIC_JACKPOT_ADDRESS=0xYourDeployedJackpotContract
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCDd4FfD38E7aF5aD01D50e4d60C2d8bC7  # Base mainnet USDC (change if testnet)
```

Hardhat deployment requires VRF + token configuration (used only in scripts, not exposed client-side). Names below must match those expected by the deploy script and custom task:

```
VRF_COORDINATOR=0xYourVrfCoordinator
VRF_SUBSCRIPTION_ID=1234          # uint64 subscription id
VRF_KEYHASH=0xYourGasLaneKeyHash  # Chainlink gas lane (no underscore; matches code)
TRIV_TOKEN_ADDRESS=0xYourTrivErc20
TRIVIAPOINTS_ADDRESS=0xYourTriviaPointsContract
FEE_RECEIVER_ADDRESS=0xDistributorOrTreasury
USDC_ADDRESS=0x833589fCDd4FfD38E7aF5aD01D50e4d60C2d8bC7
SPIN_PRICE_USDC=500000            # 0.5 USDC with 6 decimals (constructor price)
POINTS_THRESHOLD=100000           # Minimum T points to be eligible
```

After deploying the contract:
1. Add the Jackpot contract as a consumer to the Chainlink VRF subscription.
2. Fund LINK (if required by the network) to the subscription.
3. Fund the Jackpot contract with enough `$TRIV` to cover maximum prizes (e.g. 10,000,000 $TRIV jackpot). You can top up over time.
4. Set `NEXT_PUBLIC_JACKPOT_ADDRESS` so the frontend can interact.
5. Ensure the USDC allowance is granted by users before buying spins.

Prepaid spins flow:
- User approves USDC to the Jackpot contract.
- User buys N spins in one transaction (`buySpins(count)`); credits accumulate.
- User consumes one credit per `spin()` call; 24h cooldown enforced by contract.
- Chainlink VRF returns random tier; contract attempts immediate `$TRIV` payout if balance sufficient.

Frontend considerations:
- The wheel only animates after `SpinResult` event to reflect the actual on-chain outcome.
- Credits badge shows remaining spin credits and quick buy buttons (+5, +10, +100).
- Large purchases (e.g. 100 spins) may require users to increase UI allowance if you cap approvals.

Security / Ops checklist:
| Item | Action |
|------|--------|
| VRF subscription | Add Jackpot as consumer |
| TRIV funding | Transfer reward tokens to contract address |
| USDC price | Confirm `SPIN_PRICE_USDC` matches `price` state (update via `setPrice`) |
| Tier odds | Adjust with `setTiers` ensuring sum of bp = 10000 |
| Monitoring | Index `SpinRequested` & `SpinResult` for analytics |
| Withdrawal | Use `rescueTokens` only by owner for non-prize tokens or maintenance |


