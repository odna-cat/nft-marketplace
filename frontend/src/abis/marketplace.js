// ABI derived from Atomic.sol — NFTMarketplace contract
export const MARKETPLACE_ABI = [
  // listNFT(address nft, uint256 tokenId, uint256 price)
  {
    inputs: [
      { name: "nft", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
    ],
    name: "listNFT",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // buyNFT(address nft, uint256 tokenId) payable
  {
    inputs: [
      { name: "nft", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "buyNFT",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  // withdraw()
  {
    inputs: [],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // cancelListing(address nft, uint256 tokenId)
  {
    inputs: [
      { name: "nft", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "cancelListing",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // getListing(address nft, uint256 tokenId) view
  {
    inputs: [
      { name: "nft", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    name: "getListing",
    outputs: [
      {
        components: [
          { name: "seller", type: "address" },
          { name: "price", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // getPendingBalance(address user) view
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getPendingBalance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "seller", type: "address" },
      { indexed: true, name: "nft", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "price", type: "uint256" },
    ],
    name: "NFTListed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "buyer", type: "address" },
      { indexed: true, name: "seller", type: "address" },
      { indexed: true, name: "nft", type: "address" },
      { indexed: false, name: "tokenId", type: "uint256" },
      { indexed: false, name: "price", type: "uint256" },
    ],
    name: "NFTSold",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "receiver", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "RoyaltyAccrued",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "Withdrawal",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "seller", type: "address" },
      { indexed: true, name: "nft", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
    name: "ListingCancelled",
    type: "event",
  },
  {
    inputs: [{ name: "recipient", type: "address" }],
    name: "withdrawFor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
