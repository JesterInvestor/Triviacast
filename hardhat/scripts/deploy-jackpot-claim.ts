import "dotenv/config";
import { ethers } from "hardhat";

async function main() {
  const trivAddress = process.env.TRIV_TOKEN_ADDRESS || process.env.NEXT_PUBLIC_TRIV_ADDRESS;
  const serverSignerAddress = process.env.SERVER_SIGNER_ADDRESS || process.env.DISTRIBUTOR_SIGNER_ADDRESS || process.env.DISTRIBUTOR_ADMIN_ADDRESS;

  if (!trivAddress) {
    throw new Error("TRIV token address not set. Set TRIV_TOKEN_ADDRESS or NEXT_PUBLIC_TRIV_ADDRESS in your .env");
  }
  if (!serverSignerAddress) {
    throw new Error("Server signer address not set. Set SERVER_SIGNER_ADDRESS in your .env");
  }

  console.log("Deploying JackpotClaim with:");
  console.log(" - TRIV token:", trivAddress);
  console.log(" - Server signer:", serverSignerAddress);

  const JackpotClaim = await ethers.getContractFactory("JackpotClaim");
  const deployed = await JackpotClaim.deploy(trivAddress, serverSignerAddress);
  // wait for deployment in a way that's compatible with ethers v5 and v6
  if (typeof (deployed as any).waitForDeployment === 'function') {
    await (deployed as any).waitForDeployment();
  } else if (typeof (deployed as any).deployed === 'function') {
    await (deployed as any).deployed();
  } else if (deployed.deployTransaction && typeof deployed.deployTransaction.wait === 'function') {
    await deployed.deployTransaction.wait();
  }

  console.log("JackpotClaim deployed to:", deployed.address || (deployed as any).target || 'unknown');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
