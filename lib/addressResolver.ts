/**
 * Utilities for resolving wallet addresses to human-readable names
 */

/**
 * Resolve an Ethereum address to ENS name
 * @param address The Ethereum address to resolve
 * @returns The ENS name if found, null otherwise
 */
export async function resolveENS(address: string): Promise<string | null> {
  try {
    // Use a public ENS resolver
    const response = await fetch(`https://api.ensideas.com/ens/resolve/${address}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.name || null;
  } catch (error) {
    console.error('Error resolving ENS:', error);
    return null;
  }
}

/**
 * Resolve an Ethereum address to Farcaster username
 * Uses Neynar API
 * @param address The Ethereum address to resolve
 * @returns The Farcaster username if found, null otherwise
 */
export async function resolveFarcasterUsername(address: string): Promise<string | null> {
  try {
    // Use Neynar's free API endpoint
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          'accept': 'application/json',
          // Using a public endpoint - in production, you'd want your own API key
        }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const users = data[address.toLowerCase()];
    
    if (users && users.length > 0) {
      return users[0].username || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error resolving Farcaster username:', error);
    return null;
  }
}

/**
 * Get a display name for a wallet address
 * Tries Farcaster username first, then ENS, then shortened address
 * @param address The wallet address
 * @returns A human-readable display name
 */
export async function getDisplayName(address: string): Promise<string> {
  // Try Farcaster username first
  const farcasterUsername = await resolveFarcasterUsername(address);
  if (farcasterUsername) {
    return `@${farcasterUsername}`;
  }
  
  // Try ENS
  const ensName = await resolveENS(address);
  if (ensName) {
    return ensName;
  }
  
  // Fall back to shortened address
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Batch resolve multiple addresses
 * @param addresses Array of wallet addresses
 * @returns Map of address to display name
 */
export async function batchResolveDisplayNames(
  addresses: string[]
): Promise<Map<string, string>> {
  const displayNames = new Map<string, string>();
  
  // Resolve all addresses in parallel
  const results = await Promise.allSettled(
    addresses.map(async (address) => ({
      address,
      displayName: await getDisplayName(address)
    }))
  );
  
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      displayNames.set(result.value.address.toLowerCase(), result.value.displayName);
    }
  });
  
  return displayNames;
}
