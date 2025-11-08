import { describe, it, expect } from 'vitest';
import { extendAbiWithErrors } from '@/lib/contract';

describe('extendAbiWithErrors', () => {
  it('appends standard Error and Panic types', () => {
    const baseAbi: any[] = [
      { type: 'function', name: 'foo', inputs: [], outputs: [] },
    ];
    const extended = extendAbiWithErrors(baseAbi as any);
    const names = extended.filter((e: any) => e.type === 'error').map((e: any) => e.name);
    expect(names).toContain('Error');
    expect(names).toContain('Panic');
    // Keeps original entries too
    expect(extended.some((e: any) => e.name === 'foo')).toBe(true);
  });
});
