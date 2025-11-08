declare module "@neynar/react" {
  // Minimal ambient declarations to satisfy TypeScript in this repo.
  import React from 'react';
  export const NeynarContextProvider: React.FC<any>;
  export const NeynarAuthButton: React.FC<any>;
  export const NeynarUserDropdown: React.FC<any>;
  export const NeynarCastCard: React.FC<any>;
  export const NeynarProfileCard: React.FC<{ fid: number; className?: string }>;
  export const useNeynarContext: () => any;
  export const Theme: any;
  export const SIWN_variant: any;
  const _default: any;
  export default _default;
}
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
