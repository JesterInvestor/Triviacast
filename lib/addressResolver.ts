/**
 * Resolve Farcaster username by FID using Neynar v1 API
 * @param fid Farcaster ID
 * @returns Username if found, null otherwise
 */
export async function resolveFarcasterUsernameByFid(fid: number): Promise<string | null> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
    if (!apiKey) throw new Error('Neynar API key missing');
    const response = await fetch(
      `https://hub-api.neynar.com/v1/userDataByFid?fid=${fid}&user_data_type=USER_DATA_TYPE_USERNAME`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': apiKey,
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.data?.userDataBody?.value) {
      return data.data.userDataBody.value;
    }
    return null;
  } catch (error) {
    console.error('Error resolving Farcaster username by FID:', error);
    return null;
  }
}
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
    console.log(`ENS API response for ${address}:`, response.status);
    
    if (!response.ok) {
      console.log(`ENS API not OK for ${address}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`ENS data for ${address}:`, data);
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
    const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
    // Use Neynar's free API endpoint
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          'accept': 'application/json',
          ...(apiKey ? { 'api_key': apiKey, 'X-API-KEY': apiKey } : {}),
          // Prefer providing an API key via NEXT_PUBLIC_NEYNAR_API_KEY for higher limits
        }
      }
    );
    
    console.log(`Farcaster API response for ${address}:`, response.status);
    
    if (!response.ok) {
      console.log(`Farcaster API not OK for ${address}`);
      return null;
    }
    
  const data = await response.json();
  console.log(`Farcaster data for ${address}:`, data);
  const key = address.toLowerCase();
  const users = data[key] || data[address] || data[key as any];
    
    if (users && users.length > 0) {
      console.log(`Found Farcaster username for ${address}:`, users[0].username);
      return users[0].username || null;
    }
    
    console.log(`No Farcaster users found for ${address}`);
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
