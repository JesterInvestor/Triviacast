/**
 * Resolve Farcaster username by FID using Neynar v1 API
 * @param fid Farcaster ID
 * @returns Username if found, null otherwise
 */
export async function resolveFarcasterUsernameByFid(fid: number): Promise<string | null> {
  try {
  const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
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
          accept: 'application/json',
          ...(apiKey ? { 'X-API-KEY': apiKey, 'api_key': apiKey } : {}),
        },
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
  // data may use lowercase keys or original; guard with safe typing
  const raw = (data as Record<string, unknown>)[key] || (data as Record<string, unknown>)[address] || undefined;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0] as { username?: string };
    console.log(`Found Farcaster username for ${address}:`, first.username);
    return first.username || null;
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

/**
 * Poll for Farcaster usernames for a set of addresses.
 * Tries multiple times with a delay and returns a map of newly discovered usernames
 * (address -> `@username`).
 */
export async function pollFarcasterUsernames(
  addresses: string[],
  // Defaults tuned to be a bit more aggressive for apps that want faster discovery
  attempts: number = 20,
  delayMs: number = 600,
  backoffFactor: number = 1.35,
  maxDelayMs: number = 3000
): Promise<Map<string, string>> {
  const found = new Map<string, string>();

  // Helper to wait
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  // Addresses should be lowercased when stored in the map
  const remaining = new Set(addresses.map((a) => a.toLowerCase()));

  for (let i = 0; i < attempts && remaining.size > 0; i++) {
    console.debug(`pollFarcasterUsernames attempt ${i + 1}/${attempts} — remaining: ${remaining.size}`);
    try {
      // Add a breadcrumb so Sentry can show polling progress when debugging
      const Sentry = await import('@sentry/nextjs');
      Sentry.addBreadcrumb({
        category: 'farcaster.poll',
        message: `poll attempt ${i + 1}/${attempts}`,
        level: 'info',
        data: { remaining: remaining.size }
      });
    } catch (e) {
      // if Sentry isn't available, ignore — logging still works
    }

    const tries = Array.from(remaining).map(async (address) => {
      try {
        const start = Date.now();
        const username = await resolveFarcasterUsername(address);
        const latency = Date.now() - start;
        // Add a per-address breadcrumb with latency
        try {
          const Sentry = await import('@sentry/nextjs');
          Sentry.addBreadcrumb({
            category: 'farcaster.poll.addr',
            message: `polled address ${address}`,
            level: 'debug',
            data: { address, latency, attempt: i + 1 }
          });
        } catch (_) {
          // ignore if Sentry not available
        }

        if (username) {
          found.set(address, `@${username}`);
          remaining.delete(address);
        }
      } catch (e) {
        // ignore and try again on next round
      }
    });

    await Promise.all(tries);

    if (remaining.size === 0) break;

    // compute next delay with exponential backoff and a little jitter
    const rawDelay = Math.min(maxDelayMs, Math.round(delayMs * Math.pow(backoffFactor, i)));
    const jitter = 0.9 + Math.random() * 0.2; // 0.9 - 1.1
    const nextDelay = Math.round(rawDelay * jitter);
    console.debug(`Waiting ${nextDelay}ms before next poll attempt`);
    await wait(nextDelay);
  }

  return found;
}

/**
 * Resolve a Farcaster profile (username + pfp) for an address using Neynar v2 bulk-by-address
 * Returns null if no profile found or on error. The returned username is prefixed with '@' when present.
 */
export type FarcasterProfile = {
  username?: string;
  pfpUrl?: string;
  bio?: string;
  displayName?: string;
  followers?: number;
  following?: number;
  hasPowerBadge?: boolean;
  custodyAddress?: string;
  raw?: any;
};

export async function resolveFarcasterProfile(
  address: string
): Promise<FarcasterProfile | null> {
  try {
    const apiKey = process.env.NEYNAR_API_KEY || process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
    const resp = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          accept: 'application/json',
          ...(apiKey ? { 'X-API-KEY': apiKey, api_key: apiKey } : {}),
        },
      }
    );

    if (!resp.ok) return null;
    const data = await resp.json();
    const key = address.toLowerCase();
    const raw = (data as Record<string, unknown>)[key] || (data as Record<string, unknown>)[address] || undefined;
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const user = raw[0] as Record<string, any>;

    const username = user?.username ? `@${String(user.username).replace(/^@/, '')}` : undefined;

    // Try a few common fields for pfp/ avatar
    const pfpUrl = user?.pfpUrl || user?.avatar || user?.profile?.pfpUrl || user?.profile?.avatarUrl || undefined;

    const displayName = user?.displayName || user?.name || user?.profile?.displayName || undefined;
    const bio = user?.bio || user?.profile?.bio || undefined;
    const followers = typeof user?.followers === 'number' ? user.followers : (user?.follower_count as number | undefined);
    const following = typeof user?.following === 'number' ? user.following : (user?.following_count as number | undefined);
    const hasPowerBadge = !!(user?.hasPowerBadge || user?.powerBadge);
    const custodyAddress = user?.custody_address || undefined;

    return {
      username,
      pfpUrl,
      displayName,
      bio,
      followers,
      following,
      hasPowerBadge,
      custodyAddress,
      raw: user,
    };
  } catch (e) {
    console.error('Error fetching Farcaster profile for', address, e);
    return null;
  }
}
