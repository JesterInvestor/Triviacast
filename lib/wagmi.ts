import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { coinbaseWallet, metaMask, walletConnect } from '@wagmi/connectors';

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: rpcUrl ? http(rpcUrl) : http(),
  },
  connectors: [
    // Keep the Farcaster miniapp connector first so miniapp hosts can wire through it when present.
    farcasterMiniApp(),
    // Popular browser wallet (MetaMask / other injected wallets)
    metaMask(),
    // WalletConnect (v2) - set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in env to enable
    ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
      ? [
          walletConnect({
            projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
          }),
        ]
      : []),
    // Coinbase Wallet
    coinbaseWallet({
      appName: 'Triviacast',
    }),
  ],
});
