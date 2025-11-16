import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

// Quick Auth defaults to Farcaster's auth server.
const DEFAULT_AUTH_ORIGIN = "https://auth.farcaster.xyz";
const QUICK_AUTH_ORIGIN = process.env.QUICK_AUTH_ORIGIN || DEFAULT_AUTH_ORIGIN;
const JWKS_URL = process.env.MINIKIT_JWKS_URL || `${QUICK_AUTH_ORIGIN}/.well-known/jwks.json`;

type AuthBody = {
  fid?: string | number;
  jwt?: string;
  message?: string;
  signature?: string;
  domain?: string;
};

async function verifyJwt(token: string) {
  const JWKS = createRemoteJWKSet(new URL(JWKS_URL));
  const { payload } = await jwtVerify(token, JWKS, {
    // Optionally enforce issuer/audience if you know them. Keep relaxed by default.
    // issuer: QUICK_AUTH_ORIGIN,
  });
  return payload as JWTPayload & { fid?: number | string };
}

function parseDomainFromSiwe(message: string): string | undefined {
  // SIWE first line: "<domain> wants you to sign in with your Ethereum account:"
  const firstLine = message.split("\n", 1)[0] || "";
  const suffix = " wants you to sign in with your Ethereum account:";
  if (firstLine.endsWith(suffix)) return firstLine.slice(0, -suffix.length);
  return undefined;
}

async function exchangeSiwfForJwt({ domain, message, signature }: { domain?: string; message: string; signature: string; }) {
  const resolvedDomain = domain || parseDomainFromSiwe(message);
  if (!resolvedDomain) throw new Error("Unable to parse SIWF domain");
  const res = await fetch(`${QUICK_AUTH_ORIGIN}/verify-siwf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ domain: resolvedDomain, message, signature }),
  });
  if (!res.ok) throw new Error(`verify-siwf failed (${res.status})`);
  const json = await res.json();
  if (!json?.token) throw new Error("verify-siwf returned no token");
  return String(json.token);
}

export async function POST(req: NextRequest) {
  try {
    const body: AuthBody = await req.json();

    // Strategy:
    // 1) If jwt provided, verify via JWKS.
    // 2) Else if message+signature provided, exchange with Quick Auth for a JWT, then verify.
    // 3) Return verified fid (if present) and a success flag.

    let token = body.jwt;
    if (!token && body.message && body.signature) {
      token = await exchangeSiwfForJwt({ domain: body.domain, message: body.message, signature: body.signature });
    }
    if (!token) {
      return NextResponse.json({ error: "Missing jwt or message+signature" }, { status: 400 });
    }

    const claims = await verifyJwt(token);
    // Common claims: sub, exp, iat; On Quick Auth, fid often present in custom claim. Fall back to sub if needed.
    const fid = (claims as any).fid ?? (claims.sub ?? body.fid);
    if (!fid) {
      return NextResponse.json({ error: "Verified token missing fid" }, { status: 400 });
    }

    // At this point, token is valid. You can create an HttpOnly session cookie here.
    // For demo purposes, we just return verification results.
    return NextResponse.json({ ok: true, fid: String(fid), exp: claims.exp, iat: claims.iat });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Verification failed" }, { status: 400 });
  }
}
