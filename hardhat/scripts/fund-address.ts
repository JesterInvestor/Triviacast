import { ethers } from 'hardhat';

async function main() {
  const funderKey = process.env.FUNDER_PRIVATE_KEY;
  const to = process.env.TO;
  const amount = process.env.AMOUNT || '0.001'; // in ETH
  const confirm = (process.env.CONFIRM || '').toLowerCase() === 'yes';

  if (!funderKey) {
    console.error('FUNDER_PRIVATE_KEY not set. Aborting.');
    process.exit(1);
  }
  if (!to) {
    console.error('TO address not set. Aborting.');
    process.exit(1);
  }

  const provider = ethers.provider;
  const wallet = new ethers.Wallet(funderKey, provider);
  console.log('Funder wallet:', wallet.address);
  console.log(`Planned send ${amount} ETH to ${to}`);

  if (!confirm) {
    console.log('Simulate mode — set CONFIRM=yes to actually send.');
    return;
  }

  const tx = await wallet.sendTransaction({ to, value: ethers.parseEther(amount) });
  console.log('Sent tx hash:', tx.hash);
  await tx.wait();
  console.log('Funding tx mined.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
