import { ethers } from 'hardhat';

async function main() {
  const distributorAddress = process.env.DISTRIBUTOR_ADDRESS || '0x380beE8741AAa18252Eb6640760337B4c4aA65b5';
  const triviaPointsAddress = process.env.TRIVIA_POINTS_ADDRESS || '0x781158C06D333b31a58D42DF5eBB5872B0734cD5';

  const provider = ethers.provider;

  console.log('Checking contract owners on network of configured provider...');

  try {
    const dist = await ethers.getContractAt('TriviacastDistributor', distributorAddress);
    const distOwner = await dist.owner();
    console.log('TriviacastDistributor owner:', distOwner);
  } catch (err) {
    console.error('Failed to read TriviacastDistributor owner:', err);
  }

  try {
    const tp = await ethers.getContractAt('TriviaPoints', triviaPointsAddress);
    const tpOwner = await tp.owner();
    console.log('TriviaPoints owner:', tpOwner);
  } catch (err) {
    console.error('Failed to read TriviaPoints owner:', err);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
