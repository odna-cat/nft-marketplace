// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MyERC721.sol";
import "./MyOwnable.sol";
import "./EIP2981.sol";

/// @title ArtNFT
/// @notice ERC-721 NFT with EIP-2981 royalties split across multiple
///         stakeholders via a custom multi-receiver array.
contract ArtNFT is MyERC721, MyOwnable, EIP2981 {

    uint256 private _nextTokenId;

    // ── Art-specific metadata ──────────────────────────────────────
    struct ArtPiece {
        string  title;
        uint256 createdAt;
    }

    mapping(uint256 => ArtPiece) public artPieces;

    // ── Events ─────────────────────────────────────────────────────
    event ArtMinted(uint256 indexed tokenId, string title, address indexed collector);

    // ── Constructor ────────────────────────────────────────────────
    constructor()
        MyERC721("ArtNFT", "ART")
        MyOwnable()
    {}

    // ──────────────────────────────────────────────────────────────
    // Mint
    // ──────────────────────────────────────────────────────────────

    // @param to              Collector receiving the NFT
    // @param title           Display title of the artwork
    // @param uri             Metadata URI (e.g. ipfs://...)
    // @param royaltyWallets  Stakeholder addresses receiving royalty shares
    // @param royaltyShares   Each wallet's share in basis points — must sum to 10_000
    // @param totalFeeBps     Total royalty as a percentage of sale price, e.g. 1000 = 10%
    function mint(
        address to,
        string memory title,
        string memory uri,
        address[] memory royaltyWallets,
        uint96[]  memory royaltyShares,
        uint96    totalFeeBps
    ) external onlyOwner returns (uint256) {
        uint256 id = _nextTokenId++;

        // ERC-721 mint — handled by MyERC721
        _mint(to, id, uri);

        // Multi-receiver royalty setup — handled by EIP2981
        _setTokenRoyalty(id, royaltyWallets, royaltyShares, totalFeeBps);

        artPieces[id] = ArtPiece(title, block.timestamp);

        emit ArtMinted(id, title, to);
        return id;
    }

    // ──────────────────────────────────────────────────────────────
    // Burn
    // ──────────────────────────────────────────────────────────────

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "ArtNFT: not your token");
        _burn(tokenId);                    // from MyERC721
        _resetTokenRoyalty(tokenId);       // from EIP2981
        delete artPieces[tokenId];
    }

    // ──────────────────────────────────────────────────────────────
    // Royalty management (owner only)
    // ──────────────────────────────────────────────────────────────

    /// @notice Update the royalty receiver array for an existing token
    function updateRoyalty(
        uint256 tokenId,
        address[] memory royaltyWallets,
        uint96[]  memory royaltyShares,
        uint96    totalFeeBps
    ) external onlyOwner {
        require(_ownerOfExists(tokenId), "ArtNFT: token does not exist");
        _setTokenRoyalty(tokenId, royaltyWallets, royaltyShares, totalFeeBps);
    }

    // ── Internal helper — avoids reverting ownerOf() for existence check ──
    function _ownerOfExists(uint256 tokenId) internal view returns (bool) {
        // ownerOf() reverts on non-existent tokens, so wrap in try/catch
        try this.ownerOf(tokenId) returns (address) {
            return true;
        } catch {
            return false;
        }
    }

    // ──────────────────────────────────────────────────────────────
    // ERC-165 — merge MyERC721 and EIP2981 interface registrations
    // ──────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public view override(MyERC721, EIP2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}