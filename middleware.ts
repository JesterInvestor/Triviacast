import { facilitator } from "@coinbase/x402";
import { paymentMiddleware } from "x402-next";

const payTo = process.env.RESOURCE_WALLET_ADDRESS as any;
// Cast network to any to satisfy x402 typings; default to Base mainnet.
// Override with `NETWORK` env var for testing (e.g., `base-sepolia`).
const network = (process.env.NETWORK || "base") as any;

export const middleware = paymentMiddleware(
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

export const config = {
  matcher: ["/api/jackpot"],
  runtime: "nodejs",
};
