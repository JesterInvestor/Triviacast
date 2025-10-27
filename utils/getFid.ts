import neynarClient from '@/lib/neynarClient';
import { mnemonicToAccount } from 'viem/accounts';

export const getFid = async (): Promise<number> => {
  // Allow explicit override via env var for production
  if (process.env.APP_FID) {
    return Number(process.env.APP_FID);
  }

  if (!process.env.FARCASTER_DEVELOPER_MNEMONIC) {
    throw new Error('FARCASTER_DEVELOPER_MNEMONIC is not set and APP_FID not provided');
  }

  const account = mnemonicToAccount(process.env.FARCASTER_DEVELOPER_MNEMONIC);

  // Use Neynar to look up the developer user by custody address and return their fid
  const resp = await neynarClient.lookupUserByCustodyAddress({ custodyAddress: account.address });
  const fid = Number((resp as any)?.user?.fid);
  if (!fid) throw new Error('Failed to resolve app FID via Neynar');
  return fid;
};
