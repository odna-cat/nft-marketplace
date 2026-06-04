// ─────────────────────────────────────────────────────────────────
//  Update these after deploying your contracts.
//  Run:  npx hardhat run scripts/deploy.js --network <network>
// ─────────────────────────────────────────────────────────────────

export const ADDRESSES = {
  // Hardhat local (chain 31337) — replace after `npx hardhat node`
  31337: {
    MARKETPLACE: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    NFT:         "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  },
  // Sepolia testnet — fill in after deploying
    11155111: {
    MARKETPLACE: "0x6c1ddB4c0CdcCD1cb05eE59845b3E6bcD544F497",
    NFT:         "0x8c69472d969290Ff7C37C3767cde0ff2f32CA880",
  },
};

export function getAddresses(chainId) {
  return ADDRESSES[chainId] ?? null;
}
