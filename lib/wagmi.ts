import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { metaMask, walletConnect } from '@wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(),
    metaMask(),
    walletConnect({
      projectId: 'wagmi',
      showQrModal: true,
    }),
  ],
  transports: {
    [base.id]: http(),
  },
});
