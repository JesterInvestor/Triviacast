import { readContract, simulateContract, writeContract, waitForTransactionReceipt, getAccount } from '@wagmi/core';
import { base, baseSepolia } from 'viem/chains';
import { wagmiConfig } from './wagmi';
import { extendAbiWithErrors } from './contract';
import * as log from './logger';

const DISTRIBUTOR_ABI = [
  {
    inputs: [],
    name: "dailyClaim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "airdropTop5",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const DISTRIBUTOR_ADDRESS = process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "84532", 10);
const activeChain = CHAIN_ID === 8453 ? base : baseSepolia;

export function isDistributorConfigured(): boolean {
  return !!DISTRIBUTOR_ADDRESS;
}

export function hasDistributorAddress(): boolean {
  return !!DISTRIBUTOR_ADDRESS;
}

const DISTRIBUTOR_ABI_WITH_ERRORS = extendAbiWithErrors(DISTRIBUTOR_ABI as any);

export async function getDistributorOwner(): Promise<string | null> {
  if (!isDistributorConfigured()) return null;
  try {
    const owner = await readContract(wagmiConfig, {
      address: DISTRIBUTOR_ADDRESS as `0x${string}`,
      abi: DISTRIBUTOR_ABI_WITH_ERRORS as any,
      functionName: 'owner',
      args: [],
      chainId: activeChain.id,
    });
    return owner as unknown as string;
  } catch (e) {
    log.error(e, { context: 'getDistributorOwner' });
    return null;
  }
}

export async function callDailyClaim(): Promise<`0x${string}`> {
  if (!isDistributorConfigured()) throw new Error("Distributor not configured");
  const acc = getAccount(wagmiConfig);
  if (!acc?.address) throw new Error('No active account');
  const { request } = await simulateContract(wagmiConfig, {
    address: DISTRIBUTOR_ADDRESS as `0x${string}`,
    abi: DISTRIBUTOR_ABI_WITH_ERRORS as any,
    functionName: 'dailyClaim',
    args: [],
    account: acc.address,
    chainId: activeChain.id,
  });
  const hash = await writeContract(wagmiConfig, request);
  await waitForTransactionReceipt(wagmiConfig, { hash, chainId: activeChain.id });
  return hash;
}

export async function callAirdropTop5(): Promise<`0x${string}`> {
  if (!isDistributorConfigured()) throw new Error("Distributor not configured");
  const acc = getAccount(wagmiConfig);
  if (!acc?.address) throw new Error('No active account');
  const { request } = await simulateContract(wagmiConfig, {
    address: DISTRIBUTOR_ADDRESS as `0x${string}`,
    abi: DISTRIBUTOR_ABI_WITH_ERRORS as any,
    functionName: 'airdropTop5',
    args: [],
    account: acc.address,
    chainId: activeChain.id,
  });
  const hash = await writeContract(wagmiConfig, request);
  await waitForTransactionReceipt(wagmiConfig, { hash, chainId: activeChain.id });
  return hash;
}
