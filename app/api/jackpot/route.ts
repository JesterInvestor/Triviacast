import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const JACKPOT_AMOUNT = 10_000_000; // TRIV tokens
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

    // Win chance: 25% for the full jackpot
    // crypto.randomInt(0,4) returns one of 0,1,2,3 — treat 0 as a win (1/4)
    const isWinner = crypto.randomInt(0, 4) === 0;
    const prize = isWinner ? JACKPOT_AMOUNT : 0;

    const entry = {
      timestamp: new Date().toISOString(),
      address,
      isWinner,
      prize,
    };

    await appendLog(entry);

    return NextResponse.json({ success: true, isWinner, prize });
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
