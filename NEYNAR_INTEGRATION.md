Step 2: Prompt users to add the Mini App

This project supports Neynar's Mini App integration. Follow the steps below to enable the "Add Mini App" prompt that lets users add Triviacast to their Farcaster Mini Apps list.

1) Install the React helper package

```bash
npm install @neynar/react
```

Alternative (use SDK directly):

```bash
npm install @farcaster/frame-sdk
```

2) Wrap your app with the MiniAppProvider

In `components/ClientOnlyWidgets.tsx` (already updated in this repo) we wrap client-only widgets with the provider:

```tsx
import { MiniAppProvider } from '@neynar/react';

export default function ClientOnlyWidgets() {
  return (
    <ClientErrorBoundary>
      <MiniAppProvider>
        <AddMiniAppPrompt />
        <StakingDailyClaimPrompt />
        <Toaster />
      </MiniAppProvider>
    </ClientErrorBoundary>
  );
}
```

3) Use the `useMiniApp` hook to prompt to add the mini app

Example (this repo's `components/AddMiniAppPrompt.tsx`):

```tsx
import { useMiniApp } from '@neynar/react';

const { isSDKLoaded, addMiniApp } = useMiniApp();

const result = await addMiniApp();
if (result.added) {
  // added successfully
} else {
  // handle reason: 'invalid_domain_manifest' | 'rejected_by_user'
}
```

4) Webhook events

If `result.added` is true and `notificationDetails` is present, the Neynar client should have POSTed the same details to your frame events webhook. Neynar will call this webhook for add/remove and notification enable/disable events.

If you prefer to call the SDK directly, see the README for `@farcaster/frame-sdk` or call `sdk.actions.addFrame()` after installing `@farcaster/frame-sdk`.
