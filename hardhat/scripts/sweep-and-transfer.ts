import { ethers } from 'hardhat';

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  const newOwner = process.env.NEW_OWNER;
  const distributorAddress = process.env.DISTRIBUTOR_ADDRESS || '0x380beE8741AAa18252Eb6640760337B4c4aA65b5';
  const tokensEnv = process.env.TOKENS || ''; // comma separated token addresses to sweep
  const transferOwnershipFlag = process.env.TRANSFER_OWNERSHIP === '1';
  const confirm = (process.env.CONFIRM || '').toLowerCase() === 'yes';

  if (!privateKey) {
    console.error('ERROR: PRIVATE_KEY not set in environment. Aborting.');
    process.exit(1);
  }
  if (!newOwner) {
    console.error('ERROR: NEW_OWNER not set in environment. Aborting.');
    process.exit(1);
  }

  const provider = ethers.provider;
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('Using compromised wallet:', wallet.address);
  console.log('Destination (new owner):', newOwner);

  // 1) ERC20 sweep
  const tokens = tokensEnv.split(',').map(t => t.trim()).filter(Boolean);
  const erc20Abi = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function transfer(address to, uint amount) returns (bool)'
  ];

  for (const tokenAddr of tokens) {
    try {
      const token = new ethers.Contract(tokenAddr, erc20Abi, wallet);
      const balance = await token.balanceOf(wallet.address);
      if (balance.isZero()) {
        console.log(`Token ${tokenAddr} balance 0 — skipping`);
        continue;
      }
      let symbol = '';
      try { symbol = await token.symbol(); } catch { symbol = tokenAddr; }
  let decimals = 18;
      try { decimals = await token.decimals(); } catch {}

      console.log(`Found ${ethers.formatUnits(balance, decimals)} ${symbol} at ${tokenAddr}`);
      if (!confirm) {
        console.log('Simulate mode — not sending token transfer. Set CONFIRM=yes to actually send.');
        continue;
      }

      const tx = await token.transfer(newOwner, balance);
      console.log('Token transfer tx hash:', tx.hash);
      await tx.wait();
      console.log('Token transfer mined.');
    } catch (err) {
      console.error('Token sweep error for', tokenAddr, err);
    }
  }

  // 2) Native currency sweep (ETH or chain native)
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log('Native balance:', ethers.formatUnits(balance, 18));

    // Skip if balance is tiny (<0.0001 native)
    const tinyThreshold = ethers.parseEther('0.0001');
    if (balance <= tinyThreshold) {
      console.log('Native balance too small to sweep or already near-zero — skipping native sweep.');
    } else {
      // estimate gas fees using getFeeData (works with ethers v6 provider types)
      const feeData = await provider.getFeeData();
      // prefer gasPrice, fallback to maxFeePerGas, else use 10 gwei default
      const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? ethers.parseUnits('10', 'gwei');
      const gasLimit = 21000n;
      const fee = BigInt(gasPrice) * gasLimit;
      const buffer = fee / 10n; // 10% buffer
      const amountToSend = BigInt(balance) - fee - buffer;

      if (amountToSend <= 0n) {
        console.log('Not enough native balance after reserving gas — skipping native send.');
      } else {
        console.log('Planned native sweep amount:', ethers.formatUnits(amountToSend.toString(), 18));
        if (!confirm) {
          console.log('Simulate mode — not sending native transfer. Set CONFIRM=yes to actually send.');
        } else {
          const tx = await wallet.sendTransaction({ to: newOwner, value: amountToSend.toString(), gasLimit: 21000 });
          console.log('Native transfer tx hash:', tx.hash);
          await tx.wait();
          console.log('Native transfer mined.');
        }
      }
    }
  } catch (err) {
    console.error('Native sweep error:', err);
  }

  // 3) Optionally transfer contract ownership
  if (transferOwnershipFlag) {
    try {
      const distro = await ethers.getContractAt('TriviacastDistributor', distributorAddress, wallet);
      const currentOwner = await distro.owner();
      console.log('Distributor contract owner:', currentOwner);
      if (currentOwner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.error('This wallet is NOT the owner of the distributor contract. Cannot transfer ownership.');
      } else {
        console.log(`Will transfer ownership of ${distributorAddress} to ${newOwner}`);
        if (!confirm) {
          console.log('Simulate mode — not calling transferOwnership. Set CONFIRM=yes and TRANSFER_OWNERSHIP=1 to execute.');
        } else {
          const tx = await distro.transferOwnership(newOwner);
          console.log('transferOwnership tx hash:', tx.hash);
          await tx.wait();
          console.log('Ownership transfer mined.');
        }
      }
    } catch (err) {
      console.error('Error transferring ownership:', err);
    }
  } else {
    console.log('TRANSFER_OWNERSHIP not enabled — skipping ownership transfer.');
  }

  console.log('Done. IMPORTANT: remove PRIVATE_KEY from any env files or CI providers and rotate secrets NOW.');
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
