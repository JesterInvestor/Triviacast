# Wagmi Integration with Farcaster Mini App Connector

This document explains the wagmi integration in Triviacast following the Farcaster Mini App best practices.

## Overview

The app now supports wallet connection using wagmi with the `@farcaster/miniapp-wagmi-connector` package and WalletConnect, as recommended by Farcaster for Mini Apps.

## Installation

The following packages have been installed:

```bash
npm install wagmi @wagmi/connectors @farcaster/miniapp-wagmi-connector viem@2.x @tanstack/react-query
```

## Configuration

### Wagmi Config (`lib/wagmi.ts`)

The wagmi configuration is set up with the Base chain and the Farcaster Mini App connector:

```typescript
import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterMiniApp()
  ]
});
```

### Provider Setup (`components/WagmiProvider.tsx`)

The `WagmiProvider` component wraps the app to provide wagmi context:

```typescript
"use client";

import { WagmiProvider as WagmiProviderBase } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi';

export default function WagmiProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProviderBase config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProviderBase>
  );
}
```

### Layout Integration

The `WagmiProvider` is integrated in `app/layout.tsx`:

```typescript
<WagmiProvider>
  {children}
</WagmiProvider>
```

## Usage

### Using wagmi Hooks

You can now use wagmi hooks in any component:

```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi';

function MyComponent() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Connect to Farcaster wallet
  const farcasterConnector = connectors.find(
    (connector) => connector.id === 'farcasterMiniApp'
  );
  if (farcasterConnector) {
    connect({ connector: farcasterConnector });
  }
}
```

### Example Component

See `components/WagmiWalletConnect.tsx` for a complete example of a wallet connection component using wagmi.

## WalletConnect

We use WalletConnect to support QR-based connections and mobile wallets. Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in your environment to enable the QR modal.

## Mini App SDK Integration

The app already has the `@farcaster/miniapp-sdk` properly integrated:

1. **Early Ready Call**: `sdk.actions.ready()` is called in multiple places:
   - Inline script in `app/layout.tsx` (for immediate feedback)
   - `FarcasterMiniAppReady` component (React-based call)
   - `app/page.tsx` (page-level call)

2. **Recommended Pattern**: Following the Farcaster documentation, `ready()` is called:
   - As early as possible after the UI is loaded
   - In a `useEffect` hook to avoid re-renders
   - With error handling for non-Mini App environments

## Resources

- [Farcaster Mini Apps Documentation](https://docs.farcaster.xyz/developers/frames/v2/spec)
- [wagmi Documentation](https://wagmi.sh)
- [Farcaster Mini App Wagmi Connector](https://www.npmjs.com/package/@farcaster/miniapp-wagmi-connector)

## Next Steps

To fully migrate to wagmi:

1. Update components that use `useActiveAccount` from Thirdweb to use `useAccount` from wagmi
2. Replace Thirdweb's `ConnectButton` with custom wagmi-based components
3. Update contract interaction code to use wagmi's hooks (e.g., `useWriteContract`, `useReadContract`)
4. Test wallet connection in the Farcaster Mini App environment
