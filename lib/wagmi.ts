import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { metaMask, walletConnect } from '@wagmi/connectors';

// Prefer a keyed RPC to avoid public endpoint rate limits.
// Order of preference:
// 1) NEXT_PUBLIC_RPC_URL (full URL)
// 2) NEXT_PUBLIC_ALCHEMY_API_KEY (construct Alchemy Base URL)
// 3) NEXT_PUBLIC_INFURA_PROJECT_ID (construct Infura Base URL)
const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL
  || (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` : undefined)
  || (process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}` : undefined);

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Friendly runtime log to confirm which RPC host is being used (no secret keys printed).
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    const host = rpcUrl ? (new URL(rpcUrl)).origin : 'public default RPC';
    // eslint-disable-next-line no-console
    console.info('[wagmi] resolved RPC host:', host);
  } catch {
    // ignore parsing errors
  }
}

const _wagmiConfig: any = {
  // Let wagmi attempt to restore previous sessions when possible.
  autoConnect: true,
  chains: [base],
  transports: {
    [base.id]: rpcUrl ? http(rpcUrl) : http(),
  },
  // Recognize Farcaster Mini App, MetaMask (injected), and WalletConnect (Base & others)
  connectors: [
    farcasterMiniApp(),
    metaMask(),
    // Only enable WalletConnect if a valid project id is provided to avoid 403s during build/runtime
    ...(wcProjectId
      ? [
          walletConnect({
            projectId: wcProjectId,
            showQrModal: true,
          }),
        ]
      : []),
  ],
};

export const wagmiConfig = createConfig(_wagmiConfig);
