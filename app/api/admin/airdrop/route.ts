import { NextResponse } from "next/server";
import { getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { base, baseSepolia } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-admin-token");
    if (!token || token !== process.env.ADMIN_API_TOKEN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!client) {
      return NextResponse.json({ error: "Thirdweb client not configured" }, { status: 500 });
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

  const normalizedPk = pk.startsWith("0x") ? pk : `0x${pk}`;
  const account = privateKeyToAccount({ client, privateKey: normalizedPk });

    const contract = getContract({
      client,
      address: distributor,
      chain,
      abi: [
        { inputs: [], name: "airdropTop5", outputs: [], stateMutability: "nonpayable", type: "function" },
      ] as const,
    });

    const tx = prepareContractCall({ contract, method: "airdropTop5", params: [] });
    const receipt = await sendTransaction({ transaction: tx, account });

    return NextResponse.json({ ok: true, tx: receipt.transactionHash || receipt }, { status: 200 });
  } catch (e: any) {
    console.error("/api/admin/airdrop error", e);
    return NextResponse.json({ error: e?.message || "Airdrop failed" }, { status: 500 });
  }
}
