import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
  const newOwner = process.env.NEW_OWNER; // Safe address
  const trivToken = process.env.TRIV_TOKEN || '0x73385Ee7392C105d5898048F96a1bDF551B2D936';
  const dailyAmountEnv = process.env.DAILY_AMOUNT || '100000'; // human units (TRIV)
  const topAmountEnv = process.env.TOP_AMOUNT || '100000';
  const confirm = (process.env.CONFIRM || '').toLowerCase() === 'yes';

  if (!deployerKey) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY must be set in env to deploy.');
    process.exit(1);
  }
  if (!newOwner) {
    console.error('ERROR: NEW_OWNER must be set (your Safe address).');
    process.exit(1);
  }

  const provider = ethers.provider;
  const deployer = new ethers.Wallet(deployerKey, provider);
  console.log('Deployer address:', deployer.address);
  console.log('New owner (Safe):', newOwner);
  console.log('TRIV token:', trivToken);

  const dailyAmount = ethers.parseUnits(dailyAmountEnv, 18);
  const topAmount = ethers.parseUnits(topAmountEnv, 18);

  console.log('Planned dailyAmount (raw):', dailyAmount.toString());
  console.log('Planned topAmount (raw):', topAmount.toString());

  // Preview mode if not confirmed
  if (!confirm) {
    console.log('\nDRY RUN: no on-chain transactions will be sent. To execute, set CONFIRM=yes in the env and re-run.');
  }

  // Determine nonce to avoid 'nonce too low' errors
  const pendingNonce = await provider.getTransactionCount(deployer.address, 'pending');
  let nextNonce = Number(pendingNonce);

  // Deploy TriviaPoints (or reuse existing if TRIVIA_POINTS_ADDRESS provided)
  const TriviaFactory = await ethers.getContractFactory('TriviaPoints', deployer);
  let triviaAddress = '';
  const existingTrivia = process.env.TRIVIA_POINTS_ADDRESS;
  if (existingTrivia) {
    triviaAddress = existingTrivia;
    console.log('Using existing TriviaPoints at', triviaAddress);
  } else {
    if (confirm) {
      const trivia = await TriviaFactory.deploy({ nonce: nextNonce });
      await trivia.waitForDeployment();
      triviaAddress = await trivia.getAddress();
      console.log('TriviaPoints deployed at', triviaAddress);
      nextNonce = nextNonce + 1;
    } else {
      const deployTx = await TriviaFactory.getDeployTransaction();
      const data = deployTx?.data ?? '';
      console.log('TriviaPoints dry-run; init code length:', data ? data.length : 'unknown');
    }
  }

  // Deploy TriviacastDistributor with owner_ set to Safe (newOwner)
  const DistFactory = await ethers.getContractFactory('TriviacastDistributor', deployer);
  let distAddress = '';
  if (confirm) {
    const distrib = await DistFactory.deploy(newOwner, trivToken, triviaAddress, dailyAmount, topAmount, { nonce: nextNonce });
    await distrib.waitForDeployment();
    distAddress = await distrib.getAddress();
    console.log('TriviacastDistributor deployed at', distAddress);

    // Write deployed addresses to a JSON file for easy frontend update
    const out = {
      triviaPoints: triviaAddress,
      distributor: distAddress,
      owner: newOwner,
      trivToken,
      dailyAmount: dailyAmount.toString(),
      topAmount: topAmount.toString(),
    };

    const outPath = path.join(__dirname, '..', 'deployed-to-safe.json');
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log('Wrote deployed addresses to', outPath);
  } else {
    const deployTx = await DistFactory.getDeployTransaction(newOwner, trivToken, '0x00', dailyAmount, topAmount);
    const data = deployTx?.data ?? '';
    console.log('TriviacastDistributor dry-run; init code length:', data ? data.length : 'unknown');
  }

  console.log('\nNext steps: update your frontend env (NEXT_PUBLIC_*) with the new addresses and redeploy the site.');
}

main().catch((err) => {
  console.error('Deployment error:', err);
  process.exit(1);
});
