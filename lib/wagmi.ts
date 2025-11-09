import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { metaMask, walletConnect } from '@wagmi/connectors';

// Prefer a keyed RPC to avoid public endpoint rate limits
const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL
  || (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}` : undefined)
  || (process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ? `https://base-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}` : undefined);
const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

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
