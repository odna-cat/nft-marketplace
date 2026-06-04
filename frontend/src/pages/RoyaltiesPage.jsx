import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { fmtEth, fmt } from "../utils/format";
import { toast }    from "../components/Toast";
import { TxStatus } from "../components/TxStatus";

/**
 * Two royalty panels:
 * 1. Marketplace pendingWithdrawals — for sellers and direct royalty receivers
 * 2. PaymentSplitter — for payees of a specific splitter contract
 */
export function RoyaltiesPage({ marketplace, account, chainId, txHash }) {
  // ── Panel 1: Marketplace pending balance ──
  const [pendingWei,   setPendingWei]  = useState(null);
  const [fetching,     setFetching]    = useState(false);
  const [withdrawing,  setWithdrawing] = useState(false);
  const [history,      setHistory]     = useState([]);

  // ── Panel 2: PaymentSplitter ──
  const [splitterAddr,  setSplitterAddr]  = useState("");
  const [splitterInfo,  setSplitterInfo]  = useState(null);
  const [splitterLoad,  setSplitterLoad]  = useState(false);
  const [releasing,     setReleasing]     = useState({});

  const loadBalance = useCallback(async () => {
    if (!marketplace || !account || !marketplace.contractsConfigured) return;
    setFetching(true);
    try {
      setPendingWei(await marketplace.getPendingBalance(account));
    } catch (e) {
      toast.error("Balance error: " + e.message);
    } finally {
      setFetching(false);
    }
  }, [marketplace, account]);

  useEffect(() => { loadBalance(); }, [loadBalance]);

  async function handleWithdraw() {
    if (!account) { toast.error("Connect wallet first"); return; }
    if (!pendingWei || pendingWei === 0n) { toast.error("No funds to withdraw"); return; }
    setWithdrawing(true);
    const r = await marketplace.withdraw();
    setWithdrawing(false);
    if (r.ok) {
      toast.success("Withdrawal successful!");
      setHistory((h) => [{ amount: pendingWei, time: new Date().toLocaleTimeString(), hash: r.hash }, ...h]);
      setPendingWei(0n);
    } else {
      toast.error(r.error);
    }
  }

  async function loadSplitter() {
    if (!splitterAddr || !ethers.isAddress(splitterAddr)) {
      toast.error("Enter a valid splitter address"); return;
    }
    setSplitterLoad(true);
    try {
      const info = await marketplace.getSplitterInfo(splitterAddr);
      setSplitterInfo(info);
    } catch (e) {
      toast.error("Failed to load splitter: " + e.message);
    } finally {
      setSplitterLoad(false);
    }
  }

async function handleRelease(payeeAddr) {
  setReleasing((r) => ({ ...r, [payeeAddr]: true }));
  // Step 1: pull ETH from marketplace into splitter (only if needed)
  const splitterBal = await marketplace.getSplitterInfo(splitterAddr);
  const mpBal = await marketplace.getPendingBalance(splitterAddr);
  if (mpBal > 0n) {
    const pull = await marketplace.withdrawFor(splitterAddr);
    if (!pull.ok) {
      toast.error("Pull failed: " + pull.error);
      setReleasing((r) => ({ ...r, [payeeAddr]: false }));
      return;
    }
  }
  // Step 2: release from splitter to payee
  const result = await marketplace.releaseSplitter(splitterAddr, payeeAddr);
  setReleasing((r) => ({ ...r, [payeeAddr]: false }));
  if (result.ok) {
    toast.success(`Released to ${fmt(payeeAddr)}`);
    loadSplitter();
  } else {
    toast.error("Release failed: " + result.error);
  }
}

  const hasFunds = pendingWei !== null && pendingWei > 0n;

  return (
    <div>
      <div className="page-header">
        <h1>Royalties & Earnings</h1>
        <p>
          Two pull-payment systems: marketplace <code>pendingWithdrawals</code> and
          PaymentSplitter <code>release()</code>.
        </p>
      </div>

      <TxStatus hash={txHash} chainId={chainId} />

      {!account && (
        <div className="callout callout-info" style={{ marginBottom: "1.5rem" }}>
          Connect your wallet to view earnings.
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Marketplace pending</div>
          <div className="stat-val" style={{ color: hasFunds ? "#0F6E56" : undefined }}>
            {fetching ? "…" : pendingWei !== null ? fmtEth(pendingWei) : "—"}
          </div>
          <div className="stat-sub">{account ? fmt(account) : "—"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Claimed this session</div>
          <div className="stat-val">
            {fmtEth(history.reduce((a, h) => a + h.amount, 0n))}
          </div>
          <div className="stat-sub">{history.length} withdrawal{history.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Royalty standard</div>
          <div className="stat-val" style={{ fontSize: "15px", paddingTop: "4px" }}>EIP-2981</div>
          <div className="stat-sub">+ PaymentSplitter</div>
        </div>
      </div>

      {/* ── Marketplace withdraw ── */}
      <div className="section">
        <h2>Marketplace earnings</h2>
        <div className="royalty-row">
          <div>
            <div style={{ fontWeight: 500, fontSize: "14px" }}>Pending withdrawal</div>
            <div style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
              {account ?? "—"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>
              Accumulated from: seller proceeds + direct royalties (if receiver = your wallet)
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="pending-amount">
              {fetching ? "…" : pendingWei !== null ? fmtEth(pendingWei) : "—"}
            </div>
            <button
              className="btn btn-primary"
              onClick={handleWithdraw}
              disabled={!hasFunds || withdrawing}
            >
              {withdrawing ? "Withdrawing…" : "↓ Withdraw"}
            </button>
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "var(--color-muted)", paddingTop: "10px" }}>
          🔒 <code>pendingWithdrawals[msg.sender] = 0</code> runs <em>before</em> ETH transfer.
          Safe against reentrancy attacks.
        </div>
      </div>

      {/* ── PaymentSplitter panel ── */}
      <div className="section">
        <h2>PaymentSplitter release</h2>
        <p style={{ fontSize: "13px", color: "var(--color-muted)", marginBottom: "1rem" }}>
          If an ArtNFT's royalty receiver is a PaymentSplitter contract, royalties accumulate there.
          Each payee calls <code>release(theirAddress)</code> to pull their proportional share.
        </p>

        <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>PaymentSplitter contract address</label>
            <input
              type="text"
              placeholder="0x…"
              value={splitterAddr}
              onChange={(e) => setSplitterAddr(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button className="btn" onClick={loadSplitter} disabled={splitterLoad}>
              {splitterLoad ? "Loading…" : "Load"}
            </button>
          </div>
        </div>

        {splitterInfo && (
          <div>
            <div className="info-rows" style={{ marginBottom: "1rem" }}>
              <div className="info-row">
                <span>Total shares</span>
                <code>{splitterInfo.totalShares?.toString()}</code>
              </div>
              <div className="info-row">
                <span>Total released</span>
                <code>{fmtEth(splitterInfo.totalReleased)}</code>
              </div>
              <div className="info-row">
                <span>Payees</span>
                <code>{splitterInfo.payees.length}</code>
              </div>
            </div>

            {splitterInfo.payees.length === 0 ? (
              <div style={{ fontSize: "13px", color: "var(--color-muted)" }}>No payees found.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {splitterInfo.payees.map((p) => (
                  <div key={p.address} className="royalty-row">
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: "13px" }}>{p.address}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
                        Released so far: {fmtEth(p.released)}
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleRelease(p.address)}
                      disabled={releasing[p.address]}
                    >
                      {releasing[p.address] ? "Releasing…" : "Release"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── How royalties flow ── */}
      <div className="section">
        <h2>How royalties flow</h2>
        {[
          { n: 1, c: "#E6F1FB", tc: "#185FA5", t: "Sale",       b: "buyNFT(nft, tokenId) — buyer sends exact ETH price" },
          { n: 2, c: "#EEEDFE", tc: "#3C3489", t: "EIP-2981 query", b: "artPieces[tokenId].royaltyBps → amount = price × bps / 10000" },
          { n: 3, c: "#E1F5EE", tc: "#0F6E56", t: "Atomic accrual", b: "pendingWithdrawals[royaltyReceiver] += royaltyAmount — in the same tx as the NFT transfer" },
          { n: 4, c: "#FAEEDA", tc: "#854F0B", t: "Claim (marketplace)", b: "withdraw() — claim seller proceeds or direct royalties" },
          { n: 5, c: "#F5EEFF", tc: "#6D28D9", t: "Claim (splitter)", b: "PaymentSplitter.release(yourAddress) — pull proportional share if royaltyReceiver is a splitter" },
        ].map((s) => (
          <div key={s.n} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px", background: "var(--color-surface-2)", borderRadius: "8px", marginBottom: "8px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: s.c, color: s.tc, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, flexShrink: 0 }}>{s.n}</div>
            <div style={{ fontSize: "13px" }}><strong>{s.t}</strong> — {s.b}</div>
          </div>
        ))}
      </div>

      {/* ── Withdrawal history ── */}
      {history.length > 0 && (
        <div className="section">
          <h2>Withdrawal history (this session)</h2>
          {history.map((h, i) => (
            <div key={i} className="royalty-row">
              <div>
                <div style={{ fontSize: "13px" }}>{fmtEth(h.amount)}</div>
                <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>{h.time}</div>
              </div>
              {h.hash && <code style={{ fontSize: "11px", color: "var(--color-muted)" }}>{h.hash.slice(0, 18)}…</code>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
