import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// We'll mock thirdweb/react useActiveAccount and distributor/staking calls
vi.mock('thirdweb/react', () => ({
  useActiveAccount: () => ({ address: '0xabc' })
}));

vi.mock('@/lib/distributor', () => ({
  callDailyClaim: vi.fn(() => Promise.resolve()),
  isDistributorConfigured: () => true,
}));

vi.mock('@/lib/staking', () => ({
  callStake: vi.fn(() => Promise.resolve()),
  isStakingConfigured: () => true,
}));

import StakingDailyClaimPrompt from '@/components/StakingDailyClaimPrompt';

describe('StakingDailyClaimPrompt', () => {
  test('renders and allows entering stake amount', async () => {
    render(<StakingDailyClaimPrompt />);

    // Wait for the prompt to appear (SDK check is skipped by test environment)
    const input = await screen.findByPlaceholderText(/Amount to stake/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '10' } });
    expect((input as HTMLInputElement).value).toBe('10');

    const stakeBtn = screen.getByText(/Stake/i);
    expect(stakeBtn).toBeInTheDocument();
  });
});
