import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const JACKPOT_AMOUNT = 10_000_000; // TRIV tokens (jackpot)
const MEDIUM_PRIZE = 10_000; // TRIV tokens (medium tier)
const SMALL_PRIZE = 100; // TRIV tokens (small tier)
const LOG_PATH = path.join(process.cwd(), "data", "jackpot_log.json");

async function appendLog(entry: any) {
  try {
    const existing = await fs.readFile(LOG_PATH, "utf8").catch(() => "");
    const arr = existing ? JSON.parse(existing) : [];
    arr.push(entry);
    await fs.writeFile(LOG_PATH, JSON.stringify(arr, null, 2));
  } catch (e) {
    // ignore logging errors
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const address = body.address || null;

    // Tiered probabilities (using 1_000_000 resolution):
    // - Jackpot: 0.01%  => 0.0001 => 100 / 1_000_000
    // - Medium: 1%     => 0.01   => 10_000 / 1_000_000
    // - Small: 25%     => 0.25   => 250_000 / 1_000_000
    // Checks are performed from rarest to most common.
    const roll = crypto.randomInt(0, 1_000_000);
    let tier: "none" | "small" | "medium" | "jackpot" = "none";
    let prize = 0;

    if (roll < 100) {
      tier = "jackpot";
      prize = JACKPOT_AMOUNT;
    } else if (roll < 100 + 10_000) {
      tier = "medium";
      prize = MEDIUM_PRIZE;
    } else if (roll < 100 + 10_000 + 250_000) {
      tier = "small";
      prize = SMALL_PRIZE;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      address,
      roll,
      tier,
      prize,
    };

    await appendLog(entry);

    return NextResponse.json({ success: true, tier, prize, roll });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    // return basic jackpot meta
    return NextResponse.json({ success: true, jackpot: JACKPOT_AMOUNT, price: "$0.10" });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
