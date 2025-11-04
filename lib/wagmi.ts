import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { metaMask, walletConnect, coinbaseWallet } from '@wagmi/connectors';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

const _wagmiConfig: any = {
  // Let wagmi attempt to restore previous sessions when possible.
  autoConnect: true,
  chains: [base],
  transports: {
    [base.id]: rpcUrl ? http(rpcUrl) : http(),
  },
  connectors: [
    farcasterMiniApp(),
    coinbaseWallet({
      appName: 'Triviacast',
      preference: 'all', // Support both mobile and extension
    }),
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'wagmi',
      showQrModal: true,
    }),
  ],
};

export const wagmiConfig = createConfig(_wagmiConfig);
