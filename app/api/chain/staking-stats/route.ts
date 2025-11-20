import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { STAKING_ABI, TRIV_ABI } from '../../../../lib/stakingClient';
import { ethers } from 'ethers';

const RPC = process.env.NEXT_PUBLIC_RPC_URL || (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` : undefined);

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const address = url.searchParams.get('address');

    if (!address) return NextResponse.json({ error: 'missing address' }, { status: 400 });

    const TRIV_ADDRESS = process.env.NEXT_PUBLIC_TRIV_ADDRESS;
    const STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_ADDRESS;

    if (!TRIV_ADDRESS || !STAKING_ADDRESS) {
      return NextResponse.json({ error: 'staking not configured' }, { status: 500 });
    }

    // Read on-chain values server-side to avoid mobile/webview CORS issues
    const [tb, sb, er, ts] = await Promise.all([
      publicClient.readContract({ address: TRIV_ADDRESS as `0x${string}`, abi: TRIV_ABI as any, functionName: 'balanceOf', args: [address as `0x${string}`] }),
      publicClient.readContract({ address: STAKING_ADDRESS as `0x${string}`, abi: STAKING_ABI as any, functionName: 'balanceOf', args: [address as `0x${string}`] }),
      publicClient.readContract({ address: STAKING_ADDRESS as `0x${string}`, abi: STAKING_ABI as any, functionName: 'earned', args: [address as `0x${string}`] }),
      publicClient.readContract({ address: STAKING_ADDRESS as `0x${string}`, abi: STAKING_ABI as any, functionName: 'totalSupply', args: [] }),
    ]);

    return NextResponse.json({
      tokenBalance: ethers.formatUnits(tb as any, 18),
      stakedBalance: ethers.formatUnits(sb as any, 18),
      earned: ethers.formatUnits(er as any, 18),
      totalStaked: ethers.formatUnits(ts as any, 18),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
