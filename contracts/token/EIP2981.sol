// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

abstract contract EIP2981 is ERC165, IERC2981 {

    // ──  one entry per stakeholder ──────────────────────────────
    struct RoyaltyReceiver {
        address wallet;
        uint96  shareBps;   // this receiver's share of the royalty, out of 10_000
    }

    // ── CHANGED: receiver is now an array, feeBps renamed totalFeeBps ──
    struct RoyaltyInfo {
        RoyaltyReceiver[] receivers;
        uint96            totalFeeBps;  // total royalty % of sale price, e.g. 1000 = 10%
    }

    mapping(uint256 => RoyaltyInfo) private _tokenRoyalties;

    // ── Pull-payment ledger — credited by depositRoyalty() ───────────
    mapping(address => uint256) public pendingWithdrawals;

    // ── Events ─────────────────────────────────────────────────────
    event RoyaltySet(uint256 indexed tokenId, uint96 totalFeeBps, uint256 receiverCount);
    event RoyaltyDeposited(uint256 indexed tokenId, uint256 amount);
    event RoyaltyClaimed(address indexed receiver, uint256 amount);

    // ── Set royalty for a specific token — CHANGED signature ────────
    function _setTokenRoyalty(
        uint256 tokenId,
        address[] memory wallets,
        uint96[]  memory shares,
        uint96    totalFeeBps
    ) internal virtual {
        require(totalFeeBps <= 10_000, "Royalty exceeds 100%");
        require(wallets.length == shares.length, "Length mismatch");
        require(wallets.length > 0, "No receivers");

        uint256 totalShares;
        for (uint256 i = 0; i < shares.length; i++) {
            require(wallets[i] != address(0), "Invalid receiver");
            totalShares += shares[i];
        }
        require(totalShares == 10_000, "Shares must sum to 10000");

        // Clear any existing entries before writing new ones
        delete _tokenRoyalties[tokenId].receivers;

        for (uint256 i = 0; i < wallets.length; i++) {
            _tokenRoyalties[tokenId].receivers.push(
                RoyaltyReceiver(wallets[i], shares[i])
            );
        }
        _tokenRoyalties[tokenId].totalFeeBps = totalFeeBps;

        emit RoyaltySet(tokenId, totalFeeBps, wallets.length);
    }

    // ── Delete royalty (optional utility) ─────────────────────────
    function _resetTokenRoyalty(uint256 tokenId) internal virtual {
        delete _tokenRoyalties[tokenId];
    }

    // ──  read the full receiver breakdown for a token ───────────
    function getRoyaltyReceivers(uint256 tokenId)
        external view returns (RoyaltyReceiver[] memory)
    {
        return _tokenRoyalties[tokenId].receivers;
    }

    // ── EIP-2981 interface — CHANGED: receiver is now address(this) ──
    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        RoyaltyInfo storage r = _tokenRoyalties[tokenId];
        royaltyAmount = (salePrice * r.totalFeeBps) / 10_000;
        receiver = address(this);   // funds land here, then get split
    }

    // ── called by the marketplace after royaltyInfo() ───────────
    // Splits the incoming royalty across all receivers for this token
    function depositRoyalty(uint256 tokenId) external payable virtual {
        RoyaltyReceiver[] memory receivers = _tokenRoyalties[tokenId].receivers;
        require(receivers.length > 0, "No royalty receivers");

        uint256 amount = msg.value;
        uint256 distributed;

        for (uint256 i = 0; i < receivers.length; i++) {
            uint256 share = (amount * receivers[i].shareBps) / 10_000;
            pendingWithdrawals[receivers[i].wallet] += share;
            distributed += share;
        }

        // Any rounding remainder goes to the first receiver
        if (distributed < amount && receivers.length > 0) {
            pendingWithdrawals[receivers[0].wallet] += (amount - distributed);
        }

        emit RoyaltyDeposited(tokenId, amount);
    }

    // ── pull-payment claim ───────────────────────────────────────
    function claimRoyalty() external virtual {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to claim");

        pendingWithdrawals[msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");

        emit RoyaltyClaimed(msg.sender, amount);
    }

    // ── ERC-165 interface detection ────────────────────────────────
    function supportsInterface(bytes4 interfaceId)
        public view virtual override(ERC165, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}