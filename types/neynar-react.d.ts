declare module '@neynar/react' {
  import * as React from 'react';

  export type FrameNotificationDetails = {
    url: string;
    token: string;
  };

  export type AddFrameResult =
    | {
        added: true;
        notificationDetails?: FrameNotificationDetails;
      }
    | {
        added: false;
        reason: 'invalid_domain_manifest' | 'rejected_by_user';
      };

  export const MiniAppProvider: React.FC<{
    children?: React.ReactNode;
  }>;

  export function useMiniApp(): {
    /** True when the underlying Neynar SDK is loaded and ready to use. */
    isSDKLoaded: boolean;
    /** Prompt the host to add the mini app. */
    addMiniApp: () => Promise<AddFrameResult>;
  };

  export default {} as any;
}
