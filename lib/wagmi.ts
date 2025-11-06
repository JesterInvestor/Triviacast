import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { metaMask, walletConnect } from '@wagmi/connectors';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
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
