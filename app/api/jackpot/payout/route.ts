import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { sendTriv } from "@/lib/payout";

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const adminSecret = body.adminSecret || req.headers.get("x-admin-secret");
    if (!adminSecret || adminSecret !== process.env.ADMIN_API_SECRET) {
      return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
    }

    const logs = await readLogs();
    const unpaid = logs.filter((e: any) => e.prize > 0 && !e.paid && e.address);
    const results: any[] = [];

    for (const entry of unpaid) {
      try {
        const txHash = await sendTriv(entry.address, entry.prize);
        entry.paid = true;
        entry.paidTx = txHash;
        entry.paidAt = new Date().toISOString();
        results.push({ address: entry.address, prize: entry.prize, txHash });
      } catch (e: any) {
        results.push({ address: entry.address, prize: entry.prize, error: String(e) });
      }
    }

    // write updated logs
    await writeLogs(logs);

    return NextResponse.json({ success: true, results });
  } catch (e: any) {
    console.error("/api/jackpot/payout error:", e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
