# NFT Marketplace

## Project Overview

**Objective:** Develop a digital asset marketplace that automatically distributes sales revenue to multiple stakeholders upon every trade.

**Key requirements:**
- Advanced ERC-721: Extend the standard NFT contract to support EIP-2981 (Royalty Standard) with a custom multi-receiver array
- Payment Splitter: Implement a "Pull-payment" pattern (claim-based) to ensure the contract is secure against Reentrancy and "Out of Gas" errors when distributing funds to many creators
- Atomic Swaps: Ensure that the transfer of the NFT and the distribution of funds (including royalties) occur in a single atomic transaction

## Setup & Deployment

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Sepolia test ETH (from [sepoliafaucet.com](https://sepoliafaucet.com))
- Alchemy account (free) — get RPC URL from [alchemy.com](https://alchemy.com)
### 1. Install dependencies
Open terminal in the project root (`nft-marketplace/`)
```bash
npm install
npm uninstall hardhat
npm install --save-dev hardhat@2 @nomicfoundation/hardhat-toolbox dotenv
```

Verify Hardhat 2 is installed:

```bash
npx hardhat --version
```

Should print `2.x.x`, not `3.x.x`.

### 2. Initialize Hardhat

```bash
npx hardhat init
```

When prompted:
- **Which version?** → Choose `Hardhat 2 (older version)`
- **Path** → Press Enter (use current directory `.`)
- **Project type** → Choose `A Javascript project using Mocha and Ethers.js`
- **Install dependencies?** → Choose `n` (No — already installed via hardhat-toolbox)

### 3. Configure environment

Create `.env` in the project root:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
PRIVATE_KEY=your_metamask_private_key_here
```
**How to get `SEPOLIA_RPC_URL`:**
1. Go to [alchemy.com](https://alchemy.com) → sign up free
2. Create New App → Ethereum → Ethereum Sepolia
3. Click API Key → copy the HTTPS URL

**How to get `PRIVATE_KEY`:**
1. Open MetaMask → click three dots next to account name
2. Account Details → Show private key → enter password → copy

> Never commit `.env` to Git. It is listed in `.gitignore`.

### 4. Configure Hardhat
Replace the contents of `hardhat.config.js` with:
`hardhat.config.js`:

```js
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.28" },
      { version: "0.8.24" },
      { version: "0.8.20" },
      { version: "0.4.24" },
    ],
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
```

### 5. Compile

```bash
npx hardhat compile
```
Should print: `Compiled N Solidity files successfully`
### 6. Deploy to Sepolia
In `scripts/deploy.js` change the 2 address with your metamask account address
```js
3. Deploy PaymentSplitter — adjust addresses and shares as needed
  const PaymentSplitter = await ethers.getContractFactory("PaymentSplitter");
  const splitter = await PaymentSplitter.deploy(
    [
      "0xACCOUNT_1_ADDRESS",   // e.g. artist — 70%
      "0xACCOUNT_2_ADDRESS",   // e.g. gallery — 30%
    ],
    [70, 30]
  );
  await splitter.waitForDeployment();
  console.log("PaymentSplitter deployed to:", await splitter.getAddress());

  console.log("\n=== COPY THESE INTO Frontend/src/abis/addresses.js ===");
  console.log(`NFT:              "${await artNFT.getAddress()}"`);
  console.log(`MARKETPLACE:      "${await marketplace.getAddress()}"`);
  console.log(`PAYMENT_SPLITTER: "${await splitter.getAddress()}"`);
}
```
Then
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Output:
```
Deploying with: 0xYourWalletAddress
ArtNFT deployed to:         0xAAA...
NFTMarketplace deployed to: 0xBBB...
PaymentSplitter deployed to: 0xCCC...
=== COPY THESE INTO Frontend/src/abis/addresses.js ===
NFT:              "0xAAA..."
MARKETPLACE:      "0xBBB..."
PAYMENT_SPLITTER: "0xCCC...
```

### 7. Update frontend addresses

Edit `Frontend/src/abis/addresses.js`:

```js
11155111: {
  MARKETPLACE: "YOUR_NFTMARKETPLACE_KEY",
  NFT:         "YOUR_ARTNFT_KEY",
},
```

### 8. Run the frontend

```bash
cd Frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

Make sure MetaMask is:
- Installed and unlocked
- Connected to **Sepolia** network (Settings → Advanced → Show test networks → ON → select Sepolia)
- Using the same wallet that deployed the contracts

The yellow warning banner will disappear once addresses are correctly configured.
---

## Demo Guide

> **Before the demo:**
> - MetaMask connected to **Sepolia**
> - Account 1 = deployer wallet (contract owner) — has Sepolia ETH
> - Account 2 = second wallet (buyer) — has some Sepolia ETH
> - Note down your PaymentSplitter address from deploy output


---

### Step 1 — Mint an ArtNFT

**Switch to Account 1** in MetaMask (the contract owner).

Go to **Mint NFT** tab and fill in:

| Field | Value |
|---|---|
| Title | `Sunset #1` (or anything) |
| Token URI | `https://ipfs.io/ipfs/QmTest` |
| Collector | Your Account 1 address |
| Royalty receiver | Your PaymentSplitter address (from deploy output) |
| Royalty bps | 600 |

Click **✦ Mint ArtNFT** → MetaMask popup appears → click **Confirm**.

Wait for confirmation (~15 seconds). A success toast appears: *"Sunset #1 minted! Royalty: 6.00%"*

> **What happens on-chain:** `ArtNFT.mint()` is called. The token is minted to the collector with EIP-2981 royalty info embedded — `royaltyReceiver = PaymentSplitter`, `royaltyBps = 600`. Event `ArtMinted` is emitted.

---

### Step 2 — List the NFT for sale

Go to **My NFTs** tab → click **↻ Refresh**.

Your minted token appears with title, royalty %, and royalty receiver address.

- Enter price: `0.01` ETH
- Click **Approve & list**
- **First MetaMask popup** → `setApprovalForAll(marketplace, true)` → **Confirm**
- Wait for confirmation
- **Second MetaMask popup** → `listNFT(nft, tokenId, 0.01 ETH)` → **Confirm**
- Wait for confirmation. Toast: *"Sunset #1 listed at 0.01 ETH!"*

> **What happens on-chain:** Marketplace is approved to transfer your token. `listings[nft][tokenId] = { seller, price }` is stored on-chain. Event `NFTListed` is emitted.

---

### Step 3 — Buy the NFT (atomic swap)

**Switch to Account 2**  in MetaMask.

Go to **Marketplace** tab → your NFT appears with:
- Title: `"Sunset #1"`
- Price: `0.0100 ETH`
- Royalty badge: `6.00% royalty`
- Royalty receiver shown

Click **Buy now** → MetaMask popup → **Confirm** (sends exactly 0.01 ETH).

Wait for confirmation. Toast: *"Sunset #1 bought for 0.01 ETH — royalties distributed atomically!"*

> **What happens on-chain in ONE transaction:**
> 1. `royaltyInfo(tokenId, 0.01 ETH)` → returns PaymentSplitter + 0.0006 ETH royalty
> 2. `pendingWithdrawals[PaymentSplitter] += 0.0006 ETH`
> 3. `pendingWithdrawals[seller] += 0.0094 ETH`
> 4. NFT transferred from seller to buyer via `safeTransferFrom`
> 5. If step 4 fails → everything reverts. Atomic.
> Events: `NFTSold`, `RoyaltyAccrued` emitted.

---

### Step 4 — Withdraw seller proceeds (pull-payment)

**Switch back to Account 1** in MetaMask.

Go to **Royalties** tab.

- **Marketplace pending** shows `0.0094 ETH` (seller proceeds after royalty deduction)
- Click **↓ Withdraw** → MetaMask popup → **Confirm**
- Toast: *"Withdrawal successful!"*
- **Claimed this session** updates to show `0.0094 ETH`

> **What happens on-chain:** `withdraw()` runs:
> ```solidity
> uint256 amount = pendingWithdrawals[msg.sender]; // read
> pendingWithdrawals[msg.sender] = 0;              // zero FIRST
> payable(msg.sender).call{ value: amount }("");   // then transfer
> ```
> Balance zeroed **before** ETH transfer — safe against reentrancy attacks. Event `Withdrawal` emitted.

---

### Step 5 — Release PaymentSplitter royalties (multi-receiver)

Still on **Royalties** tab, still on **Account 1**.

Paste the PaymentSplitter address in the input field → click **Load**.

You will see:
- **Total shares:** 100
- **Total released:** 0.0000 ETH
- **Payees:** 2
  - `address of account1` — 70 shares → Released so far: 0.0000 ETH
  - `address of account2` — 30 shares → Released so far: 0.0000 ETH

Click **Release** next to Account 1  → MetaMask popup → **Confirm**.

Wait for confirmation. Click **Load** again to refresh:
- Account 1 released: `0.000042 ETH` (70% of 0.00006 ETH royalty)
- Total released: `0.000042 ETH`

**Switch to Account 2** → click **Release** next to `0x88E8...d085` → **Confirm**.

Click **Load** again:
- Account 2 released: `0.000018 ETH` (30% of 0.00006 ETH royalty)  
- Total released: `0.00006 ETH`

Try clicking **Release** again → toast: *"Release failed: PaymentSplitter: account is not due payment"* → proves double-claiming is prevented ✅

> **What happens on-chain:** `release(payeeAddress)` calculates:
> `payment = (totalReceived × shares / totalShares) - alreadyReleased`
> Then transfers proportional ETH to the payee.

---

### Step 6 — Verify on Activity feed

Go to **Activity** tab → click **↻ Refresh**.

All on-chain events appear in chronological order:

| Event | Description |
|---|---|
| 🟢 **Minted** | `"Sunset #1"` minted as token #0 |
| 🔵 **Listed** | Token #0 listed at 0.01 ETH |
| 🟢 **Sale** | Token #0 sold for 0.01 ETH |
| 🟣 **Royalty** | 0.0006 ETH accrued to PaymentSplitter |
| 🟡 **Withdrawal** | 0.0094 ETH withdrawn by seller |

Click any **tx ↗** link to open the transaction on **Sepolia Etherscan** and verify it happened on-chain.

Use the filter buttons (**Sale**, **Listed**, **Royalty**, **Withdrawal**, **Minted**) to show specific event types.

---

## Technical Concepts

### EIP-2981 (NFT Royalty Standard)

A standard interface for NFT royalty payments. Marketplaces call `royaltyInfo(tokenId, salePrice)` before every sale to determine how much royalty to pay and to whom.

```solidity
function royaltyInfo(uint256 tokenId, uint256 salePrice)
    external view returns (address receiver, uint256 royaltyAmount)
```

Royalty amount = `salePrice × royaltyBps / 10000`

### Pull-Payment Pattern

Instead of the contract pushing ETH to multiple receivers (which can fail if one receiver is a malicious contract), funds are credited to a mapping and each receiver pulls their own funds:

```
Push (dangerous):  contract → sends ETH to A, B, C, D (any can block all)
Pull (safe):       contract → credits mapping → A pulls, B pulls, C pulls independently
```

### Atomic Swap

The NFT transfer and fund distribution happen in a single transaction. Either everything succeeds or everything reverts — there is no intermediate state where the NFT has been transferred but funds have not been distributed.

### Reentrancy Attack (and prevention)

A reentrancy attack occurs when a malicious contract calls back into the marketplace during an ETH transfer. Prevention:

```solidity
//  Vulnerable — sends ETH before zeroing balance
function withdraw() external {
    payable(msg.sender).transfer(pendingWithdrawals[msg.sender]);
    pendingWithdrawals[msg.sender] = 0;
}

//  Safe — zeros balance BEFORE sending ETH (Checks-Effects-Interactions)
function withdraw() external nonReentrant {
    uint256 amount = pendingWithdrawals[msg.sender];
    pendingWithdrawals[msg.sender] = 0;
    payable(msg.sender).transfer(amount);
}
```

### Basis Points (BPS)

A unit for expressing percentages precisely without floating point:

| BPS | Percentage |
|---|---|
| 100 | 1% |
| 500 | 5% |
| 1000 | 10% |
| 10000 | 100% |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contracts | Solidity 0.8.20 |
| NFT standard | ERC-721 (OpenZeppelin) |
| Royalty standard | EIP-2981 |
| Development framework | Hardhat 2 |
| Testnet | Ethereum Sepolia |
| Frontend | React + Vite |
| Blockchain library | ethers.js v6 |
| Wallet | MetaMask |
| RPC provider | Alchemy |