import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterMiniApp(),
    new CoinbaseWalletConnector({
      options: {
        // Optional label to show in wallets list
        appName: 'Triviacast',
      },
    })
  ]
});
