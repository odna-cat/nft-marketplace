// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MyOwnable.sol";
import "./MyERC721.sol";

// OZ used ONLY as interface — zero OZ logic enters this contract
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract ArtNFT is MyERC721, MyOwnable, IERC2981 {

    uint256 private _nextTokenId;

    // ── Art-specific metadata ──────────────────────────────────────
    struct ArtPiece {
        string  title;
        uint256 createdAt;
        uint96  royaltyBps;   // per-token royalty e.g. 1000 = 10%
        address royaltyReceiver;
    }

    mapping(uint256 => ArtPiece) public artPieces;

    // ── Events ─────────────────────────────────────────────────────
    event ArtMinted(uint256 indexed tokenId, string title, address indexed collector);
    event RoyaltyUpdated(uint256 indexed tokenId, address receiver, uint96 bps);

    // ── Constructor ────────────────────────────────────────────────
    // Both parents need constructor args — call them explicitly
    constructor()
        MyERC721("ArtNFT", "ART")   // sets name + symbol
        MyOwnable()                  // sets msg.sender as owner
    {}

    // ── Mint ───────────────────────────────────────────────────────
    function mint(
        address collector,
        string memory title,
        string memory uri,
        address royaltyReceiver,
        uint96  royaltyBps
    ) external onlyOwner returns (uint256) {
        require(royaltyBps <= 10_000, "ArtNFT: royalty exceeds 100%");
        require(royaltyReceiver != address(0), "ArtNFT: zero royalty receiver");

        uint256 id = _nextTokenId++;

        // _mint comes from MyERC721 — your manual implementation
        _mint(collector, id, uri);

        artPieces[id] = ArtPiece(title, block.timestamp, royaltyBps, royaltyReceiver);

        emit ArtMinted(id, title, collector);
        return id;
    }

    // ── Burn ───────────────────────────────────────────────────────
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "ArtNFT: not your token");
        _burn(tokenId);   // from MyERC721
        delete artPieces[tokenId];
    }

    // ── Update royalty ─────────────────────────────────────────────
    function updateRoyalty(
        uint256 tokenId,
        address receiver,
        uint96  bps
    ) external onlyOwner {
        require(bps <= 10_000, "ArtNFT: royalty exceeds 100%");
        artPieces[tokenId].royaltyReceiver = receiver;
        artPieces[tokenId].royaltyBps      = bps;
        emit RoyaltyUpdated(tokenId, receiver, bps);
    }

    // ── IERC2981: royaltyInfo ──────────────────────────────────────
    // Marketplaces call this before every sale.
    // We implement the logic ourselves — OZ only provided the interface.
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external view override
        returns (address receiver, uint256 royaltyAmount)
    {
        ArtPiece memory piece = artPieces[tokenId];
        return (
            piece.royaltyReceiver,
            (salePrice * piece.royaltyBps) / 10_000
        );
    }

    // ── ERC-165: merge all parent interfaces ───────────────────────
    // Both MyERC721 and IERC2981 have supportsInterface —
    // Solidity forces you to resolve the conflict explicitly here.
    function supportsInterface(bytes4 interfaceId)
        public view override(MyERC721, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);   // delegates to MyERC721
    }
}