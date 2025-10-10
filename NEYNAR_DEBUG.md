Troubleshooting Farcaster username resolution

- API: https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=<address>
- Optional env: NEXT_PUBLIC_NEYNAR_API_KEY (for higher rate limits)
- Client logs added in lib/addressResolver.ts. Open browser console on /leaderboard to see:
  - Farcaster API response status per address
  - Parsed data object keys
  - Whether users were found

If responses are 401/403 or empty, set NEXT_PUBLIC_NEYNAR_API_KEY in your environment and redeploy.
