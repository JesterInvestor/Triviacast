import { ethers } from 'hardhat';

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const newOwner = process.env.NEW_OWNER;
  const distributorAddress = process.env.DISTRIBUTOR_ADDRESS || '0x380beE8741AAa18252Eb6640760337B4c4aA65b5';

  if (!privateKey) {
    console.error('PRIVATE_KEY not set. This script needs the same signer you used earlier to estimate from that account.');
    process.exit(1);
  }
  if (!newOwner) {
    console.error('NEW_OWNER not set.');
    process.exit(1);
  }

  const provider = ethers.provider;
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('Estimating from wallet:', wallet.address);

  const distro = await ethers.getContractAt('TriviacastDistributor', distributorAddress, wallet);
  const iface = distro.interface;
  const data = iface.encodeFunctionData('transferOwnership', [newOwner]);

  // Estimate gas
  const gasEstimate = await provider.estimateGas({ to: distributorAddress, from: wallet.address, data });
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? ethers.parseUnits('10', 'gwei');

  console.log('Gas estimate:', gasEstimate.toString());
  console.log('Gas price (wei):', gasPrice.toString());

  const estimatedFee = BigInt(gasEstimate.toString()) * BigInt(gasPrice.toString());
  console.log('Estimated fee (wei):', estimatedFee.toString());
  console.log('Estimated fee (ETH):', ethers.formatUnits(estimatedFee.toString(), 18));

  console.log('\nSummary: fund the compromised wallet with at least the estimated fee plus a small buffer (10-20%) to ensure success.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
