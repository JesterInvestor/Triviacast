import { NextResponse } from "next/server";
import { bytesToHex, hexToBytes } from "viem";
import { getFid } from '@/utils/getFid';

// Simple in-memory rate limiter (dev). Per-IP, max 10 requests per minute.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateMap = new Map<string, { ts: number; count: number }>();

function rateLimit(ip: string) {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.ts > RATE_LIMIT_WINDOW_MS) {
    rateMap.set(ip, { ts: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'local';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const keyHex = String(body?.keyHex || body?.key || "").trim();
    if (!keyHex) return NextResponse.json({ error: 'Missing keyHex in body' }, { status: 400 });

    // If a server-side Farcaster developer mnemonic is configured, sign a key request
    // with the local signer. This keeps APP_PRIVATE_KEY / mnemonic server-side.
    if (process.env.FARCASTER_DEVELOPER_MNEMONIC) {
      try {
        const { mnemonicToAccount } = await import('viem/accounts');
        const { ViemLocalEip712Signer } = await import('@farcaster/hub-nodejs');

        const account = mnemonicToAccount(String(process.env.FARCASTER_DEVELOPER_MNEMONIC));
        const appSigner = new ViemLocalEip712Signer(account);

        // deadline: 1 hour from now (server chooses reasonable short TTL)
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 60);

        // Determine requestFid: prefer explicit APP_FID, otherwise resolve via Neynar
        // using the FARCASTER_DEVELOPER_MNEMONIC-derived custody address.
        let requestFid = BigInt(0);
        try {
          const fidNum = await getFid();
          requestFid = BigInt(fidNum);
        } catch (fidErr) {
          console.warn('Could not resolve app FID via getFid(); falling back to 0', fidErr);
          requestFid = BigInt(0);
        }

        const keyBytes = hexToBytes(keyHex as `0x${string}`);
        const sig = await appSigner.signKeyRequest({ requestFid, key: keyBytes, deadline });
        if (sig.isErr()) {
          return NextResponse.json({ error: 'Signing failed' }, { status: 500 });
        }
        const sigHex = bytesToHex(sig.value);
        return NextResponse.json({ metadataHex: sigHex, note: 'signed with server-side app mnemonic (dev: requestFid=0)' });
      } catch (err: unknown) {
        console.error('signed-key-request internal error', err);
        return NextResponse.json({ error: 'Internal server error while signing' }, { status: 500 });
      }
    }

    // No server signer configured: return a deterministic dev metadata blob so
    // the frontend can continue to test flows locally. THIS IS NOT FOR PRODUCTION.
    const devMeta = bytesToHex(Buffer.from(JSON.stringify({ key: keyHex, generatedAt: Date.now() })));
    return NextResponse.json({ metadataHex: devMeta, dev: true, note: 'No FARCASTER_DEVELOPER_MNEMONIC configured; returning dev metadata' });
  } catch (err: unknown) {
    console.error('signed-key-request error', err);
    return NextResponse.json({ error: 'Bad request or internal error' }, { status: 500 });
  }
}
