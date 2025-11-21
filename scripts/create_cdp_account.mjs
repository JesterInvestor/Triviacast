import 'dotenv/config';

try {
  const mod = await import('@coinbase/cdp-sdk');
  const CdpClient = mod.CdpClient ?? (mod.default && (mod.default.CdpClient ?? mod.default));
  if (!CdpClient) {
    throw new Error('Could not import CdpClient from @coinbase/cdp-sdk');
  }

  const cdp = new CdpClient();

  if (!cdp.evm || typeof cdp.evm.createAccount !== 'function') {
    throw new Error('CDP SDK does not expose evm.createAccount(); check SDK version and authentication.');
  }

  const account = await cdp.evm.createAccount();
  console.log(`Created EVM account: ${account.address}`);
} catch (err) {
  console.error('Error creating CDP account:');
  if (err && err.stack) console.error(err.stack);
  else console.error(err);
  process.exitCode = 1;
}
