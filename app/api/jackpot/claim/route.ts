import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { Wallet, ethers } from "ethers";

export const runtime = "nodejs";

const LOG_PATH = path.join(process.cwd(), "data", "jackpot_log.json");

async function readLogs() {
  const txt = await fs.readFile(LOG_PATH, "utf8").catch(() => "[]");
  return JSON.parse(txt || "[]");
}

async function writeLogs(arr: any[]) {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true }).catch(() => {});
  await fs.writeFile(LOG_PATH, JSON.stringify(arr, null, 2));
}

// EIP-712 domain and types
const DOMAIN_NAME = "Triviacast Jackpot";
const DOMAIN_VERSION = "1";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const address = (body.address || req.headers.get("x-address")) as string | undefined;
    if (!address) return NextResponse.json({ success: false, error: "address required" }, { status: 400 });

    // read logs and find unpaid winner for this address
    const logs = await readLogs();
    // find the most recent unpaid winning entry for this address
    const entryIndex = logs.map((e: any, i: number) => ({ e, i })).reverse().find((r: any) => {
      const e = r.e;
      return e.address && e.address.toLowerCase() === address.toLowerCase() && e.prize > 0 && !e.paid;
    })?.i;

    if (entryIndex === undefined) {
      return NextResponse.json({ success: false, error: "no unpaid winning entry for this address" }, { status: 404 });
    }

    const entry = logs[entryIndex];

    // Build claim payload
    // Use nonce to prevent replay — either existing claimNonce or timestamp-based
    const nonce = entry.claimNonce ?? Math.floor(Date.now() / 1000);
    const expiresInSeconds = 60 * 60; // 1 hour
    const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;

    // Amount should be the atomic token amount (in TRIV tokens with 18 decimals)
    const amount = ethers.parseUnits(String(entry.prize ?? 0), 18).toString();

    // Server private key must be present to sign
    const PK = process.env.DISTRIBUTOR_ADMIN_PRIVATE_KEY;
    if (!PK) return NextResponse.json({ success: false, error: "server signing key not configured" }, { status: 500 });

    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || process.env.CHAIN_ID || 8453);

    // Use CLAIM_CONTRACT_ADDRESS if provided; otherwise fall back to the TRIV token address (not recommended).
    const verifyingContract = process.env.CLAIM_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_TRIV_ADDRESS || "";
    const domain = {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: chainId,
      verifyingContract,
    } as const;

    const types = {
      Claim: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "expiry", type: "uint256" },
      ],
    } as const;

    const message = {
      recipient: address,
      amount,
      nonce,
      expiry,
    };

    const wallet = new Wallet(PK);
    // signTypedData
    const signature = await (wallet as any)._signTypedData(domain, types as any, message);

    // persist claim metadata on the entry
    entry.claimNonce = nonce;
    entry.claimExpiresAt = new Date(expiry * 1000).toISOString();
    entry.signatureIssued = true;
    entry.signature = signature;

    // write back
    await writeLogs(logs);

    return NextResponse.json({ success: true, signature, domain, types, message });
  } catch (e: any) {
    console.error("/api/jackpot/claim error:", e);
    return NextResponse.json({ success: false, error: String(e), stack: e?.stack }, { status: 500 });
  }
}

