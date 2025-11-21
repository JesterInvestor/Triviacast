import dotenv from "dotenv";
import path from "path";
import hre from "hardhat";

// Load repo .env.local so CI/local env vars are available when running from hardhat/
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env.local") });

async function main() {
  const address = process.env.CLAIM_CONTRACT_ADDRESS;
  const triv = process.env.TRIV_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_TRIV_ADDRESS;
  const signer = process.env.SERVER_SIGNER_ADDRESS || process.env.DISTRIBUTOR_SIGNER_ADDRESS || process.env.DISTRIBUTOR_ADMIN_ADDRESS || process.env.SERVER_SIGNER;

  if (!address) throw new Error('CLAIM_CONTRACT_ADDRESS not set in .env.local or env');
  if (!triv) throw new Error('TRIV token address not set (TRIV_TOKEN_ADDRESS or NEXT_PUBLIC_TRIV_ADDRESS)');
  if (!signer) throw new Error('Server signer address not set (SERVER_SIGNER_ADDRESS or DISTRIBUTOR_SIGNER_ADDRESS)');

  console.log('Verifying JackpotClaim at', address);
  console.log('Constructor args:', triv, signer);

  try {
    await hre.run('verify:verify', {
      address,
      constructorArguments: [triv, signer]
    });
    console.log('Verification task completed');
  } catch (err: any) {
    console.error('Verification failed:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();
