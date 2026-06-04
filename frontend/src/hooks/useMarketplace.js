import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { MARKETPLACE_ABI } from "../abis/marketplace";
import { NFT_ABI }         from "../abis/nft";
import { SPLITTER_ABI }    from "../abis/splitter";
import { getAddresses }    from "../abis/addresses";

export function useMarketplace({ signer, provider, chainId, account }) {
  const [loading, setLoading] = useState({});
  const [txHash,  setTxHash]  = useState(null);

  function addrs() {
    const a = getAddresses(chainId);
    if (!a) throw new Error(`No contracts configured for chain ${chainId}`);
    if (!a.MARKETPLACE || !a.NFT) {
      throw new Error(
        `Contract addresses are empty for chain ${chainId}. ` +
        `Fill in MARKETPLACE and NFT addresses in src/abis/addresses.js`
      );
    }
    return a;
  }

  function marketplace(sp) {
    return new ethers.Contract(addrs().MARKETPLACE, MARKETPLACE_ABI, sp ?? signer);
  }

  function nft(sp) {
    return new ethers.Contract(addrs().NFT, NFT_ABI, sp ?? signer);
  }

  function splitter(address, sp) {
    return new ethers.Contract(address, SPLITTER_ABI, sp ?? signer);
  }

  function setLoad(key, val) {
    setLoading((p) => ({ ...p, [key]: val }));
  }

  async function send(key, fn) {
    setLoad(key, true);
    try {
      const tx = await fn();
      setTxHash(tx.hash);
      await tx.wait();
      setTxHash(null);
      return { ok: true, hash: tx.hash };
    } catch (e) {
      const msg = e?.reason || e?.shortMessage || e?.message || "Transaction failed";
      return { ok: false, error: msg };
    } finally {
      setLoad(key, false);
    }
  }

  // ── READ — NFT ────────────────────────────────────────────────────
  async function getArtPiece(tokenId) {
    return nft(provider).artPieces(tokenId);
  }

  async function getRoyaltyInfo(tokenId, salePrice) {
    return nft(provider).royaltyInfo(tokenId, salePrice);
  }

  async function getTokenURI(tokenId) {
    return nft(provider).tokenURI(tokenId);
  }

  async function getOwnerOf(tokenId) {
    return nft(provider).ownerOf(tokenId);
  }

  async function getNFTBalance(addr) {
    return nft(provider).balanceOf(addr ?? account);
  }

  async function getNFTOwner() {
    return nft(provider).owner();
  }

  async function isApproved(tokenId, ownerAddr) {
    const { MARKETPLACE } = addrs();
    const c = nft(provider);
    const [approved, approvedAll] = await Promise.all([
      c.getApproved(tokenId),
      c.isApprovedForAll(ownerAddr ?? account, MARKETPLACE),
    ]);
    return approved.toLowerCase() === MARKETPLACE.toLowerCase() || approvedAll;
  }

  // ── READ — Marketplace ────────────────────────────────────────────
  async function getListing(tokenId) {
    const { NFT } = addrs();
    return marketplace(provider).getListing(NFT, tokenId);
  }

  async function getPendingBalance(addr) {
    return marketplace(provider).getPendingBalance(addr ?? account);
  }

  // ── READ — PaymentSplitter ────────────────────────────────────────
  async function getSplitterInfo(splitterAddr) {
    const c = splitter(splitterAddr, provider);
    const [totalShares, totalReleased] = await Promise.all([
      c.totalShares(),
      c.totalReleased(),
    ]);
    const payees = [];
    for (let i = 0; i < 20; i++) {
      try {
        const addr = await c.payee(i);
        const rel  = await c.released(addr);
        payees.push({ address: addr, released: rel });
      } catch { break; }
    }
    return { totalShares, totalReleased, payees };
  }

  // ── WRITE — ArtNFT ────────────────────────────────────────────────
  async function mintNFT(collector, title, uri, royaltyReceiver, royaltyBps) {
    return send("mint", () =>
      nft().mint(collector, title, uri, royaltyReceiver, royaltyBps)
    );
  }

  async function burnNFT(tokenId) {
    return send("burn_" + tokenId, () => nft().burn(tokenId));
  }

  async function updateRoyalty(tokenId, receiver, bps) {
    return send("updateRoyalty_" + tokenId, () =>
      nft().updateRoyalty(tokenId, receiver, bps)
    );
  }

  // ── WRITE — Marketplace ───────────────────────────────────────────
  async function approveMarketplace(tokenId, useApprovalForAll = true) {
    const { MARKETPLACE } = addrs();
    return send("approve_" + tokenId, () => {
      const c = nft();
      return useApprovalForAll
        ? c.setApprovalForAll(MARKETPLACE, true)
        : c.approve(MARKETPLACE, tokenId);
    });
  }

  async function listNFT(tokenId, priceEth) {
    const { NFT } = addrs();
    return send("list_" + tokenId, () =>
      marketplace().listNFT(NFT, tokenId, ethers.parseEther(priceEth))
    );
  }

  async function cancelListing(tokenId) {
    const { NFT } = addrs();
    return send("cancel_" + tokenId, () =>
      marketplace().cancelListing(NFT, tokenId)
    );
  }

  async function buyNFT(tokenId, priceEth) {
    const { NFT } = addrs();
    return send("buy_" + tokenId, () =>
      marketplace().buyNFT(NFT, tokenId, { value: ethers.parseEther(priceEth) })
    );
  }

  async function withdraw() {
    return send("withdraw", () => marketplace().withdraw());
  }

  async function withdrawFor(recipient) {
    return send("withdrawFor_" + recipient, () =>
      marketplace().withdrawFor(recipient)
    );
  }

  // ── WRITE — PaymentSplitter ───────────────────────────────────────
  async function releaseSplitter(splitterAddr, payeeAddr) {
    return send("release_" + payeeAddr, () =>
      splitter(splitterAddr).release(payeeAddr)
    );
  }

  // ── EVENTS ────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (blocksBack = 10000) => {
    if (!provider) return [];
    const mp   = marketplace(provider);
    const nftC = nft(provider);
    const latest = await provider.getBlockNumber();
    const from   = Math.max(0, latest - blocksBack);

    const [sold, listed, accrued, withdrawn, cancelled, minted, royaltyUpdated] =
      await Promise.all([
        mp.queryFilter(mp.filters.NFTSold(),            from, "latest"),
        mp.queryFilter(mp.filters.NFTListed(),          from, "latest"),
        mp.queryFilter(mp.filters.RoyaltyAccrued(),     from, "latest"),
        mp.queryFilter(mp.filters.Withdrawal(),         from, "latest"),
        mp.queryFilter(mp.filters.ListingCancelled(),   from, "latest"),
        nftC.queryFilter(nftC.filters.ArtMinted(),      from, "latest"),
        nftC.queryFilter(nftC.filters.RoyaltyUpdated(), from, "latest"),
      ]);

    return [
      ...sold.map((e) => ({ type: "buy",          text: `Token #${e.args.tokenId} sold for ${ethers.formatEther(e.args.price)} ETH`,       addr: e.args.buyer,    block: e.blockNumber, hash: e.transactionHash })),
      ...listed.map((e) => ({ type: "list",        text: `Token #${e.args.tokenId} listed at ${ethers.formatEther(e.args.price)} ETH`,      addr: e.args.seller,   block: e.blockNumber, hash: e.transactionHash })),
      ...accrued.map((e) => ({ type: "royalty",    text: `Royalty accrued — ${ethers.formatEther(e.args.amount)} ETH`,                      addr: e.args.receiver, block: e.blockNumber, hash: e.transactionHash })),
      ...withdrawn.map((e) => ({ type: "withdraw", text: `Withdrawal — ${ethers.formatEther(e.args.amount)} ETH`,                           addr: e.args.user,     block: e.blockNumber, hash: e.transactionHash })),
      ...cancelled.map((e) => ({ type: "cancel",   text: `Listing cancelled for token #${e.args.tokenId}`,                                  addr: e.args.seller,   block: e.blockNumber, hash: e.transactionHash })),
      ...minted.map((e) => ({ type: "mint",        text: `"${e.args.title}" minted as token #${e.args.tokenId}`,                            addr: e.args.collector,block: e.blockNumber, hash: e.transactionHash })),
      ...royaltyUpdated.map((e) => ({ type: "royaltyUpdate", text: `Royalty updated for token #${e.args.tokenId} → ${(Number(e.args.bps)/100).toFixed(2)}%`, addr: e.args.receiver, block: e.blockNumber, hash: e.transactionHash })),
    ].sort((a, b) => b.block - a.block);
  }, [provider]); // eslint-disable-line react-hooks/exhaustive-deps

  const contractsConfigured = (() => {
    try { const a = getAddresses(chainId); return !!(a?.MARKETPLACE && a?.NFT); }
    catch { return false; }
  })();

  return {
    loading,
    txHash,
    contractsConfigured,
    // reads
    getArtPiece, getRoyaltyInfo, getTokenURI, getOwnerOf,
    getNFTBalance, getNFTOwner, isApproved,
    getListing, getPendingBalance, getSplitterInfo, fetchEvents,
    // writes
    mintNFT, burnNFT, updateRoyalty,
    approveMarketplace, listNFT, cancelListing, buyNFT,
    withdraw, withdrawFor, releaseSplitter,
  };
}