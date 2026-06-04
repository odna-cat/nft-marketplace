const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Deploy ArtNFT
  const ArtNFT = await ethers.getContractFactory("ArtNFT");
  const artNFT = await ArtNFT.deploy();
  await artNFT.waitForDeployment();
  console.log("ArtNFT deployed to:", await artNFT.getAddress());

  // 2. Deploy NFTMarketplace
  const Marketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  console.log("NFTMarketplace deployed to:", await marketplace.getAddress());

  // 3. Deploy PaymentSplitter
  const PaymentSplitter = await ethers.getContractFactory("PaymentSplitter");
  const splitter = await PaymentSplitter.deploy(
    [
      "0xa9e1Ea154B568b445caC736041D25b74DB36A559",  // Account 1 — 70%
      "0x88E8C87D53Cd0cae2F5E1A7F124b751097FBd085",  // Account 2 — 30%
    ],
    [70, 30]
  );
  await splitter.waitForDeployment();
  console.log("PaymentSplitter deployed to:", await splitter.getAddress());

  console.log("\n=== COPY THESE INTO src/abis/addresses.js ===");
  console.log(`NFT:              "${await artNFT.getAddress()}"`);
  console.log(`MARKETPLACE:      "${await marketplace.getAddress()}"`);
  console.log(`PAYMENT_SPLITTER: "${await splitter.getAddress()}"`);
}

main().catch((err) => { console.error(err); process.exit(1); });