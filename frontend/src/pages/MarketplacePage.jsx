import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { bpsToPercent, fmt, fmtEth } from "../utils/format";
import { toast }    from "../components/Toast";
import { TxStatus } from "../components/TxStatus";

const EMOJIS = ["🔮","⚡","🌌","👁️","🎭","🗝️","🧬","🌀","🔺","💎","🏺","🌊","🔥","🌙","🦋"];

export function MarketplacePage({ marketplace, account, chainId, txHash }) {
  const [listings, setListings] = useState([]);
  const [fetching, setFetching] = useState(false);

  // Loads active listings by scanning NFTListed events, then fetches ArtPiece metadata
  const loadListings = useCallback(async () => {
    if (!marketplace || !marketplace.contractsConfigured) return;
    setFetching(true);
              try {
                // Scan tokenIds 0–49
                const results = await Promise.all(
                  Array.from({ length: 50 }, (_, i) => i).map(async (tokenId) => {
                    try {
            const listing = await marketplace.getListing(tokenId);
            if (!listing || listing.price === 0n) return null;

            let artPiece = { title: `Token #${tokenId}`, createdAt: 0n, royaltyBps: 0, royaltyReceiver: "" };
            try { artPiece = await marketplace.getArtPiece(tokenId); } catch { return null; }

            return {
              tokenId,
              seller:          listing.seller,
              price:           listing.price,
              title:           artPiece.title,
              createdAt:       artPiece.createdAt,
              royaltyBps:      artPiece.royaltyBps,
              royaltyReceiver: artPiece.royaltyReceiver,
            };
          } catch { return null; }
        })
      );
      setListings(results.filter(Boolean).sort((a, b) => a.tokenId - b.tokenId));
    } catch (e) {
      toast.error("Failed to load listings: " + e);
    } finally {
      setFetching(false);
    }
  }, [marketplace]);

  useEffect(() => { loadListings(); }, [loadListings]);

  async function handleBuy(tokenId, price, title) {
    if (!account) { toast.error("Connect your wallet first"); return; }
    const priceEth = ethers.formatEther(price);
    const result = await marketplace.buyNFT(tokenId, priceEth);
    if (result.ok) {
      toast.success(`"${title}" bought for ${priceEth} ETH — royalties distributed atomically!`);
      loadListings();
    } else {
      console.error(result.error);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Art Marketplace</h1>
        <p>Buy ArtNFTs with royalties distributed atomically on every trade — EIP-2981 + pull-payment</p>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <span className="chip chip-success">Reentrancy-safe</span>
        <span className="chip chip-blue">Atomic swap</span>
        <span className="chip chip-purple">EIP-2981 royalties</span>
        <span className="chip chip-muted">ArtNFT contract</span>
      </div>

      <TxStatus hash={txHash} chainId={chainId} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <span style={{ fontSize: "14px", color: "var(--color-muted)" }}>
          {fetching ? "Scanning listings…" : `${listings.length} active listing${listings.length !== 1 ? "s" : ""}`}
        </span>
        <button className="btn btn-sm" onClick={loadListings} disabled={fetching}>↻ Refresh</button>
      </div>

      {!fetching && listings.length === 0 && (
        <div className="empty-state">
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🖼️</div>
          <p>No active listings on this network.<br />Mint an ArtNFT and list it to get started.</p>
        </div>
      )}

      <div className="grid-3">
        {listings.map((item) => (
          <div className="nft-card" key={item.tokenId}>
            <div className="nft-img">
              <span style={{ fontSize: "52px" }}>{EMOJIS[item.tokenId % EMOJIS.length]}</span>
              <span className="royalty-badge">
                {bpsToPercent(item.royaltyBps)} royalty
              </span>
            </div>
            <div className="nft-body">
              <div className="nft-name">{item.title || `Token #${item.tokenId}`}</div>
              <div className="nft-meta">#{item.tokenId} · Seller: {fmt(item.seller)}</div>
              {item.royaltyReceiver && (
                <div className="nft-meta" style={{ marginTop: "2px" }}>
                  Royalty → <span style={{ fontFamily: "monospace" }}>{fmt(item.royaltyReceiver)}</span>
                </div>
              )}
              {item.createdAt > 0n && (
                <div className="nft-meta" style={{ marginTop: "2px" }}>
                  Created {new Date(Number(item.createdAt) * 1000).toLocaleDateString()}
                </div>
              )}
              <div className="nft-footer" style={{ marginTop: "12px" }}>
                <div>
                  <div className="price-label">Price</div>
                  <div className="price-val">{fmtEth(item.price)}</div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleBuy(item.tokenId, item.price, item.title)}
                  disabled={!account || marketplace?.loading?.["buy_" + item.tokenId]}
                >
                  {marketplace?.loading?.["buy_" + item.tokenId] ? "Buying…" : "Buy now"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
