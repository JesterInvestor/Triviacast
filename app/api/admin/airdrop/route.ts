import { NextResponse } from "next/server";
import { base, baseSepolia } from "viem/chains";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import crypto from "crypto";
import Redis from "ioredis";
import * as log from '@/lib/logger';

// Redis-backed rate limiter (falls back to in-memory Map when Redis not configured)
// Do NOT create a Redis client at module import time — lazy-create inside the
// runtime path to avoid connection attempts during Next.js build/SSG.
const redisUrl = process.env.REDIS_URL || process.env.NEXT_PUBLIC_REDIS_URL || null;
let redis: Redis | null = null;
let redisInitialized = false;

function initRedisIfNeeded() {
  if (!redisUrl || redisInitialized) return;
  try {
    redis = new Redis(redisUrl);
    // Attach safe error handler to avoid unhandled exceptions (NOAUTH etc.)
    redis.on('error', (err) => {
      try {
        log.error(err, { context: 'redis', msg: 'Redis client error' });
      } catch (_) {
        // swallow
      }
    });
  } catch (e) {
    // If client creation fails, keep redis as null and fall back to memory limiter
    try { log.error(e, { context: 'redis.init' }); } catch (_) {}
    redis = null;
  } finally {
    redisInitialized = true;
  }
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 15 * 60 * 1000): Promise<boolean> {
  // Lazy-init Redis at runtime only
  initRedisIfNeeded();
  if (redis) {
    try {
      const key = `rate:${identifier}`;
      const windowSec = Math.max(1, Math.floor(windowMs / 1000));
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSec);
      }
      return current <= maxRequests;
    } catch (err) {
      // On Redis errors, fall back to in-memory
      try { log.error(err, { context: 'rate-limit', msg: 'Redis error, falling back to memory limiter' }); } catch (_) {}
    }
  }

  // In-memory fallback
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

function verifyAdminAuth(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const timestamp = req.headers.get("x-timestamp");

  if (!authHeader || !timestamp) {
    return false;
  }

  // Check timestamp is within 5 minutes
  const now = Date.now();
  const requestTime = parseInt(timestamp);
  if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
    return false;
  }

  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) {
    console.error("ADMIN_API_SECRET not configured");
    return false;
  }

  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(timestamp);
  const expectedSignature = hmac.digest('hex');

  // Check if auth header matches expected signature
  return crypto.timingSafeEqual(
    Buffer.from(authHeader),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: Request) {
  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for") ||
                     req.headers.get("x-real-ip") ||
                     "unknown";

    // Rate limiting: 5 requests per 15 minutes per IP
    if (!(await checkRateLimit(clientIP))) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    // Verify HMAC authentication
    if (!verifyAdminAuth(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distributor = process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS;
    if (!distributor) {
      return NextResponse.json({ error: "Distributor address not set" }, { status: 500 });
    }

    const pk = process.env.DISTRIBUTOR_ADMIN_PRIVATE_KEY;
    if (!pk) {
      return NextResponse.json({ error: "Server signer key not set" }, { status: 500 });
    }

    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
    const chain = chainId === 8453 ? base : baseSepolia;

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || chain.rpcUrls.default.http[0];
    const normalizedPk = pk.startsWith("0x") ? pk : `0x${pk}`;
    const account = privateKeyToAccount(normalizedPk as `0x${string}`);

    const walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // Minimal ABI for airdropTop5()
    const ABI = [
      { inputs: [], name: "airdropTop5", outputs: [], stateMutability: "nonpayable", type: "function" },
    ] as const;

    const hash = await walletClient.writeContract({
      address: distributor as `0x${string}`,
      abi: ABI,
      functionName: "airdropTop5",
      args: [],
      chain,
      account,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({ ok: true, tx: receipt.transactionHash }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("/api/admin/airdrop error", err?.message || "Unknown error");
    return NextResponse.json({ error: err?.message || "Airdrop failed" }, { status: 500 });
  }
}
