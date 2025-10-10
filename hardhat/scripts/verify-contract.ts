import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x781158C06D333b31a58D42DF5eBB5872B0734cD5";
  
  console.log("Verifying TriviaPoints contract on Base mainnet...");
  console.log("Contract Address:", contractAddress);
  console.log("");

  try {
    const contract = await ethers.getContractAt("TriviaPoints", contractAddress);
    
    // Check if contract exists by checking code
    const code = await ethers.provider.getCode(contractAddress);
    if (code === "0x") {
      console.log("❌ ERROR: No contract code found at this address!");
      console.log("The contract may not be deployed or the address is wrong.");
      return;
    }
    
    console.log("✅ Contract code found!");
    
    // Try to read basic data
    const totalWallets = await contract.getTotalWallets();
    console.log("Total Wallets:", totalWallets.toString());
    
    // Try reading a test wallet
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("Deployer Address:", deployerAddress);
    
    const deployerPoints = await contract.getPoints(deployerAddress);
    console.log("Deployer Points:", deployerPoints.toString());
    
    console.log("");
    console.log("✅ Contract is working correctly!");
    
  } catch (error: any) {
    console.error("❌ Error reading from contract:");
    console.error(error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
