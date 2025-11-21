import { facilitator } from "@coinbase/x402";
import { paymentMiddleware } from "x402-next";
import { NextResponse } from "next/server";

const payTo = process.env.RESOURCE_WALLET_ADDRESS as any;
// Cast network to any to satisfy x402 typings; default to Base mainnet.
// Override with `NETWORK` env var for testing (e.g., `base-sepolia`).
const network = (process.env.NETWORK || "base") as any;

// Allow disabling x402 middleware for fast local/dev testing by setting DISABLE_X402=1.
// IMPORTANT: Do NOT enable this in production.
let _middleware: any;
if (process.env.DISABLE_X402 === "1") {
  _middleware = (req: Request) => {
    // simply continue to the route handler
    return NextResponse.next();
  };
} else {
  _middleware = paymentMiddleware(
    payTo,
    {
      "/api/jackpot": {
        price: "$0.10",
        network,
        config: {
          description: "Spin the TRIV Jackpot (0.1 USDC per spin)",
        },
      },
    },
    facilitator,
  );
}

export const middleware = _middleware as any;

export const config = {
  matcher: ["/api/jackpot"],
  runtime: "nodejs",
};
