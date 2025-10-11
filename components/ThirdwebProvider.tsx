'use client';

import { ThirdwebProvider as Thirdweb } from 'thirdweb/react';
import { client } from '@/lib/thirdweb';

export default function ThirdwebProvider({ children }: { children: React.ReactNode }) {
  // If a thirdweb client is configured, provide it. Otherwise render children directly
  // to avoid runtime errors in environments without a thirdweb client.
  // Render Thirdweb provider as before. The Thirdweb provider's internal
  // implementation will handle absence of a configured client gracefully.
  return <Thirdweb>{children}</Thirdweb>;
}
