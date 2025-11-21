import { facilitator } from "@coinbase/x402";
import { paymentMiddleware } from "x402-next";

const payTo = process.env.RESOURCE_WALLET_ADDRESS as any;
const network = process.env.NETWORK || "base-sepolia";

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
