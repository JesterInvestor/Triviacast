import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { metaMask, walletConnect } from '@wagmi/connectors';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: rpcUrl ? http(rpcUrl) : http(),
  },
  connectors: [
    farcasterMiniApp(),
    metaMask(),
    walletConnect({
      projectId: 'wagmi',
      showQrModal: true,
    }),
  ],
  autoConnect: true,
});
