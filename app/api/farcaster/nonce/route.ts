import { NextResponse } from "next/server";
import neynarClient from '@/lib/neynarClient';
import { createPublicClient, http } from 'viem';

// Try to resolve on-chain nonces for IdRegistry / KeyGateway.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const contract = url.searchParams.get('contract') || '';
    const address = url.searchParams.get('address') || '';

    if (!contract || !address) return NextResponse.json({ error: 'contract and address query params required' }, { status: 400 });

    // Prefer Neynar on-chain events if configured
    if (process.env.NEYNAR_API_KEY) {
      try {
        const api = (neynarClient as any)?.onChainEventsApi || (neynarClient as any);
        if (api && typeof api.lookupOnChainIdRegistryEventByAddress === 'function') {
          const resp = await api.lookupOnChainIdRegistryEventByAddress(address as string);
          // Attempt to find a nonce in returned data
          // Response shapes vary; attempt multiple access patterns
          const maybe = (resp as any)?.data || resp;
          // search for a number field named nonce in the first event
          const first = Array.isArray(maybe) ? maybe[0] : (maybe?.events?.[0] || maybe?.event || maybe);
          const candidate = first?.nonce ?? first?.sequence ?? first?.seq ?? first?.data?.nonce ?? null;
          const nonce = candidate != null ? Number(candidate) : 0;
          return NextResponse.json({ nonce, source: 'neynar' });
        }
      } catch (err) {
        console.warn('Neynar nonce lookup failed', err);
      }
    }

    // If an RPC URL is configured, try to read using viem
    if (process.env.FARCASTER_RPC_URL) {
      try {
        const client = createPublicClient({ transport: http(process.env.FARCASTER_RPC_URL) });
        // Try several common function names for nonce retrieval
        const abiCandidates = [
          [{ name: 'nonces', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }],
          [{ name: 'nonce', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }],
        ];

        const contractAddress = (contract === 'idRegistry') ? (process.env.FARCASTER_ID_REGISTRY_ADDRESS || '') : (process.env.FARCASTER_KEY_GATEWAY_ADDRESS || '');
        if (!contractAddress) return NextResponse.json({ error: 'Contract address not configured in env', status: 400 });

        for (const abi of abiCandidates) {
          try {
            const val = await (client as any).readContract({ address: contractAddress as `0x${string}`, abi: abi as any, functionName: (abi[0] as any).name, args: [address as `0x${string}`] });
            const nonce = Number(val ?? 0);
            return NextResponse.json({ nonce, source: 'rpc' });
          } catch (err) {
            // try next
          }
        }

        return NextResponse.json({ nonce: 0, note: 'Could not read nonce with provided ABIs', source: 'rpc' });
      } catch (err) {
        console.error('RPC nonce lookup failed', err);
        return NextResponse.json({ nonce: 0, note: 'RPC lookup error' });
      }
    }

    // Fallback: return 0 (dev)
    return NextResponse.json({ nonce: 0, dev: true, note: 'No NEYNAR_API_KEY or FARCASTER_RPC_URL configured; returning 0' });
  } catch (err: unknown) {
    console.error('nonce endpoint error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
