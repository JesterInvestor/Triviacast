import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { metaMask, walletConnect } from '@wagmi/connectors';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

export const wagmiConfig = createConfig({
  // Try to restore a previous wallet session automatically when possible.
  // This is safe for server-side rendering because the reconnect attempts
  // only run on the client when hooks mount. Keeping this enabled improves
  // UX (restores WalletConnect/MetaMask/Farcaster session) while being
  // non-invasive.
  autoConnect: true,
  chains: [base],
  connectors: [
    farcasterMiniApp(),
    metaMask(),
    walletConnect({
      projectId: 'wagmi',
      showQrModal: true,
    }),
  ],
});
