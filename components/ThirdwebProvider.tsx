'use client';

import { ThirdwebProvider as Thirdweb } from 'thirdweb/react';
import { client } from '@/lib/thirdweb';

export default function ThirdwebProvider({ children }: { children: React.ReactNode }) {
  // Always wrap with ThirdwebProvider to support hooks, even without a client
  return <Thirdweb>{children}</Thirdweb>;
}
