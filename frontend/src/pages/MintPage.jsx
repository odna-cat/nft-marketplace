import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast }    from "../components/Toast";
import { TxStatus } from "../components/TxStatus";
import { bpsToPercent, fmt } from "../utils/format";

export function MintPage({ marketplace, account, chainId, txHash }) {
  const [form, setForm] = useState({
    collector:       "",
    title:           "",
    uri:             "",
    royaltyReceiver: "",
    royaltyBps:      "",
  });
  const [busy,        setBusy]        = useState(false);
  const [lastMinted,  setLastMinted]  = useState(null);
  const [isOwner,     setIsOwner]     = useState(false);

  // Check if connected wallet is the NFT contract owner
  useEffect(() => {
    if (!account || !marketplace || !marketplace.contractsConfigured) return;
    marketplace.getNFTOwner()
      .then((o) => setIsOwner(o.toLowerCase() === account.toLowerCase()))
      .catch(() => setIsOwner(false));
  }, [account, marketplace]);

  // Pre-fill collector with connected wallet
  useEffect(() => {
    if (account && !form.collector) {
      setForm((f) => ({ ...f, collector: account }));
    }
  }, [account]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const bpsNum    = Number(form.royaltyBps);
  const bpsValid  = form.royaltyBps !== "" && bpsNum >= 0 && bpsNum <= 10000;
  const addrValid = (a) => a && ethers.isAddress(a);
  const canSubmit =
    addrValid(form.collector) &&
    form.title.trim() &&
    form.uri.trim() &&
    addrValid(form.royaltyReceiver) &&
    bpsValid &&
    !busy;

  async function handleMint() {
    if (!account) { toast.error("Connect your wallet first"); return; }
    if (!isOwner) { toast.error("Only the contract owner can mint"); return; }
    setBusy(true);
    const result = await marketplace.mintNFT(
      form.collector,
      form.title,
      form.uri,
      form.royaltyReceiver,
      bpsNum,
    );
    setBusy(false);
    if (result.ok) {
      toast.success(`"${form.title}" minted! Royalty: ${bpsToPercent(bpsNum)}`);
      setLastMinted({ ...form, hash: result.hash });
      setForm((f) => ({ ...f, title: "", uri: "" }));
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Mint ArtNFT</h1>
        <p>
          Calls <code>ArtNFT.mint(collector, title, uri, royaltyReceiver, royaltyBps)</code>.
          Only the contract owner can mint.
        </p>
      </div>

      <TxStatus hash={txHash} chainId={chainId} />

      {/* {account && !isOwner && (
        <div className="callout callout-info" style={{ marginBottom: "1rem" }}>
          Connected as <code>{fmt(account)}</code> — this wallet is <strong>not</strong> the NFT contract owner.
          Only the owner can mint.
        </div>
      )} */}
      {!account && (
        <div className="callout callout-info" style={{ marginBottom: "1rem" }}>
          Connect your wallet to mint.
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* ── Main form ── */}
        <div className="section" style={{ flex: "1 1 480px" }}>
          <h2>Artwork details</h2>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label>Title <span className="req">*</span></label>
            <input
              type="text"
              placeholder='e.g. "Sunset Over Metropolis"'
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label>Token URI <span className="req">*</span></label>
            <input
              type="text"
              placeholder="ipfs://… or https://…"
              value={form.uri}
              onChange={(e) => set("uri", e.target.value)}
            />
            <span className="field-hint">IPFS CID or HTTPS URL pointing to the artwork JSON metadata</span>
          </div>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label>Collector (recipient) <span className="req">*</span></label>
            <input
              type="text"
              placeholder="0x…"
              value={form.collector}
              onChange={(e) => set("collector", e.target.value)}
              className={form.collector && !addrValid(form.collector) ? "input-error" : ""}
            />
            {form.collector && !addrValid(form.collector) && (
              <span className="field-error">Invalid address</span>
            )}
            <span className="field-hint">Who receives this token</span>
          </div>

          <div className="divider" />
          <h2 style={{ marginBottom: "1rem" }}>Royalty configuration</h2>

          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label>Royalty receiver <span className="req">*</span></label>
            <input
              type="text"
              placeholder="0x… (wallet or PaymentSplitter address)"
              value={form.royaltyReceiver}
              onChange={(e) => set("royaltyReceiver", e.target.value)}
              className={form.royaltyReceiver && !addrValid(form.royaltyReceiver) ? "input-error" : ""}
            />
            {form.royaltyReceiver && !addrValid(form.royaltyReceiver) && (
              <span className="field-error">Invalid address</span>
            )}
            <span className="field-hint">
              Can be a plain wallet <em>or</em> a deployed PaymentSplitter contract
              (splits royalties proportionally among multiple payees)
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Royalty fee (bps) <span className="req">*</span></label>
              <input
                type="number"
                placeholder="e.g. 1000"
                min={0}
                max={10000}
                value={form.royaltyBps}
                onChange={(e) => set("royaltyBps", e.target.value)}
                className={form.royaltyBps && !bpsValid ? "input-error" : ""}
              />
              {form.royaltyBps && !bpsValid && (
                <span className="field-error">Must be 0–10000</span>
              )}
              <span className="field-hint">10000 bps = 100%</span>
            </div>
            <div className="form-group">
              <label>Preview</label>
              <div className="preview-box">
                {form.royaltyBps && bpsValid ? bpsToPercent(bpsNum) : "—"}
              </div>
              <span className="field-hint">of every sale goes to receiver</span>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "8px" }}>
            <button
              className="btn btn-primary"
              onClick={handleMint}
              disabled={!canSubmit}
            >
              {busy ? "Minting…" : "✦ Mint ArtNFT"}
            </button>
          </div>
        </div>

        {/* ── Side panel: function breakdown ── */}
        <div style={{ flex: "0 0 280px" }}>
          <div className="section">
            <h2>Function called</h2>
            <div style={{ fontFamily: "monospace", fontSize: "12px", lineHeight: 1.7, color: "var(--color-muted)" }}>
              ArtNFT.mint(<br />
              &nbsp;&nbsp;<span style={{ color: "var(--color-text)" }}>collector</span>,&nbsp;
              <span style={{ color: "var(--color-success)" }}>// recipient<br /></span>
              &nbsp;&nbsp;<span style={{ color: "var(--color-text)" }}>title</span>,&nbsp;
              <span style={{ color: "var(--color-success)" }}>// artwork name<br /></span>
              &nbsp;&nbsp;<span style={{ color: "var(--color-text)" }}>uri</span>,&nbsp;
              <span style={{ color: "var(--color-success)" }}>// metadata URL<br /></span>
              &nbsp;&nbsp;<span style={{ color: "var(--color-text)" }}>royaltyReceiver</span>,<br />
              &nbsp;&nbsp;<span style={{ color: "var(--color-text)" }}>royaltyBps</span><br />
              )
            </div>
          </div>
          <div className="section" style={{ marginTop: 0 }}>
            <h2>PaymentSplitter tip</h2>
            <p style={{ fontSize: "13px", color: "var(--color-muted)", lineHeight: 1.6 }}>
              If multiple people share royalties (e.g. artist + gallery), deploy a
              <strong> PaymentSplitter</strong> contract first with their addresses and share weights,
              then use that contract's address as the royalty receiver here.
            </p>
          </div>
        </div>
      </div>

      {/* ── Last minted summary ── */}
      {lastMinted && (
        <div className="section" style={{ maxWidth: "640px", marginTop: "1rem" }}>
          <h2>Last minted ✓</h2>
          <div className="info-rows">
            <div className="info-row"><span>Title</span><strong>{lastMinted.title}</strong></div>
            <div className="info-row"><span>Collector</span><code>{lastMinted.collector}</code></div>
            <div className="info-row"><span>URI</span><code style={{ fontSize: "11px", wordBreak: "break-all" }}>{lastMinted.uri}</code></div>
            <div className="info-row"><span>Royalty receiver</span><code>{lastMinted.royaltyReceiver}</code></div>
            <div className="info-row"><span>Royalty</span><code>{bpsToPercent(Number(lastMinted.royaltyBps))}</code></div>
            {lastMinted.hash && (
              <div className="info-row">
                <span>Tx hash</span>
                <code style={{ fontSize: "11px" }}>{lastMinted.hash.slice(0, 24)}…</code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
