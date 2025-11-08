import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@wagmi/core', async () => {
  return {
    readContract: vi.fn(async () => BigInt(42)),
  } as any;
});

describe('getPointsFromChain (mocked)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000';
    process.env.NEXT_PUBLIC_CHAIN_ID = '84532';
  });

  it('returns numeric value from mocked read', async () => {
    const { getPointsFromChain } = await import('@/lib/contract');
    const value = await getPointsFromChain('0x0000000000000000000000000000000000000001');
    expect(value).toBe(42);
  });
});
