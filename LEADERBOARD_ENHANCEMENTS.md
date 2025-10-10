# Leaderboard Enhancements

## Summary of Changes

The leaderboard has been enhanced to display **all users with T points** and show their **Farcaster usernames** or **.eth names** instead of just wallet addresses.

## Features Added

### 1. Display All Users
- **Before**: Limited to top 100 users
- **After**: Shows all users who have earned T points
- Dynamically fetches total wallet count from the blockchain
- Shows player count at the top: "Showing all X players with T points"

### 2. Human-Readable Names
- **Farcaster Usernames**: Shows `@username` if the wallet is linked to a Farcaster account
- **ENS Names**: Shows `.eth` domains if registered
- **Fallback**: Shows shortened wallet address if no name is found

### 3. Enhanced Display
- **Top 3 medals**: 🥇 🥈 🥉 for the top three players
- **Dual display**: Shows username/ENS on top line, wallet address below (if name found)
- **Loading state**: Animated brain icon while fetching data
- **Column rename**: "Wallet Address" → "Player" for better clarity

## Technical Implementation

### New File: `lib/addressResolver.ts`
- `resolveENS(address)`: Resolves Ethereum addresses to ENS names
- `resolveFarcasterUsername(address)`: Resolves addresses to Farcaster usernames via Neynar API
- `getDisplayName(address)`: Prioritizes Farcaster → ENS → shortened address
- `batchResolveDisplayNames(addresses)`: Efficiently resolves multiple addresses in parallel

### Updated Files

#### `lib/tpoints.ts`
- `getLeaderboard()`: Now fetches all entries from blockchain (not limited to 100)
- `updateLeaderboard()`: Stores all entries in localStorage (no trimming)

#### `components/Leaderboard.tsx`
- Added display name resolution for all wallet addresses
- Shows loading state while fetching data
- Enhanced table with player names and medals
- Parallel resolution of all addresses for better performance

## Usage

The leaderboard will automatically:
1. Fetch all users with T points from the blockchain
2. Resolve each wallet to Farcaster username (if available)
3. Fall back to ENS name (if available)
4. Show shortened address as last resort

## API Integration

### Farcaster Username Resolution
Uses Neynar's public API endpoint:
```
GET https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses={address}
```

### ENS Resolution
Uses ENS Ideas public resolver:
```
GET https://api.ensideas.com/ens/resolve/{address}
```

## Performance Considerations

- All name resolutions happen in parallel for fast loading
- Addresses are batch-resolved to minimize API calls
- Failed resolutions gracefully fall back to wallet addresses
- Loading state prevents layout shift

## Future Enhancements

Potential improvements:
- Cache resolved names in localStorage
- Add user profile links
- Show Farcaster profile pictures
- Add search/filter functionality
- Pagination for very large leaderboards

## Example Display

```
Rank  Player                              T Points
🥇 #1  @vitalik.eth                       15,000
       0x1234...5678
🥈 #2  alice.eth                           12,500
       0xabcd...ef01
🥉 #3  @bob                                10,000
       0x9876...5432
#4    0x2468...1357                       8,500
```

## Notes

- Farcaster username resolution requires the wallet to be verified on Farcaster
- ENS resolution requires the user to have set a reverse record
- All API calls are error-handled with graceful fallbacks
