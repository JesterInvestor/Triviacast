'use client';

import { ThirdwebProvider as Thirdweb } from 'thirdweb/react';
import { createThirdwebClient, type ThirdwebClient } from 'thirdweb';

const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

let client: ThirdwebClient | undefined;
if (clientId) {
  client = createThirdwebClient({ clientId });
}

export default function ThirdwebProvider({ children }: { children: React.ReactNode }) {
  if (!client) {
    return <>{children}</>;
  }
  return <Thirdweb>{children}</Thirdweb>;
}
