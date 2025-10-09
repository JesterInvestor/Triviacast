# Quiz Challenge - Farcaster Trivia App

A Next.js-based trivia quiz mini-game that encourages users to answer questions in a timed format. Built for Farcaster with wallet connection support via Thirdweb.

## Features

- **Timed Quiz Format**: 5-minute quiz with 10 trivia questions
- **Open Trivia Database Integration**: Fetches questions from OpenTDB API
- **Real-time Scoring**: Instant feedback on answers with score tracking
- **Thirdweb Wallet Connect**: Seamless wallet connection for Web3 users
- **Responsive Design**: Beautiful UI with Tailwind CSS
- **Farcaster Integration**: Ready for Farcaster miniapp deployment
- **Vercel Deployment**: Optimized for deployment on Vercel

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- A Thirdweb Client ID (get one at [thirdweb.com](https://thirdweb.com))

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

4. Add your Thirdweb Client ID to `.env.local`:
```
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_actual_client_id
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Quiz Features

### Timer System
- 5-minute overall time limit for the entire quiz
- Visual timer with color-coded warnings (green → yellow → red)
- Automatic quiz completion when time expires

### Question Display
- Questions fetched from Open Trivia Database
- Multiple choice format with 4 options
- HTML entity decoding for special characters
- Randomized answer order for each question

### Scoring & Results
- Real-time score tracking
- Detailed results page with answer review
- Performance feedback based on percentage score
- Visual indicators for correct/incorrect answers

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Wallet Integration**: Thirdweb SDK
- **API**: Open Trivia Database
- **Deployment**: Vercel

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JesterInvestor/Quiz)

## Farcaster Integration

The app includes Farcaster miniapp configuration in `public/farcaster-manifest.json`. 

To integrate with Farcaster:
1. Deploy your app to a public URL (e.g., Vercel)
2. Update the URLs in `farcaster-manifest.json` with your actual domain
3. Register your miniapp with Farcaster

## API Routes

### GET `/api/questions`

Fetches trivia questions from Open Trivia Database.

**Query Parameters:**
- `amount` (default: 10): Number of questions to fetch
- `difficulty` (default: medium): Question difficulty (easy, medium, hard)
- `category` (optional): Question category ID

**Example:**
```
GET /api/questions?amount=10&difficulty=medium
```

## Project Structure

```
Quiz/
├── app/
│   ├── api/
│   │   └── questions/
│   │       └── route.ts          # API route for fetching questions
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/
│   ├── Quiz.tsx                  # Main quiz component
│   ├── QuizQuestion.tsx          # Question display component
│   ├── QuizResults.tsx           # Results display component
│   ├── Timer.tsx                 # Timer component
│   ├── ThirdwebProvider.tsx      # Thirdweb provider wrapper
│   └── WalletConnect.tsx         # Wallet connection button
├── types/
│   └── quiz.ts                   # TypeScript type definitions
└── public/
    └── farcaster-manifest.json   # Farcaster configuration
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
