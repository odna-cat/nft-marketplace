// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MyOwnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

contract ArtNFT is ERC721URIStorage, MyOwnable, IERC2981 {

    uint256 private _nextTokenId;

    struct ArtPiece {
        string  title;
        uint256 createdAt;
        uint96  royaltyBps;
        address royaltyReceiver;
    }
    struct RoyaltyInfo {
    address receiver;
    uint96 feeNumerator;
    }

    function getRoyalties(uint256 tokenId) external view returns (RoyaltyInfo[] memory) {
        RoyaltyInfo[] memory royalties = new RoyaltyInfo[](1);
        royalties[0] = RoyaltyInfo({
            receiver: artPieces[tokenId].royaltyReceiver,
            feeNumerator: artPieces[tokenId].royaltyBps
        });
        return royalties;
    }
    mapping(uint256 => ArtPiece) public artPieces;

    event ArtMinted(uint256 indexed tokenId, string title, address indexed collector);
    event RoyaltyUpdated(uint256 indexed tokenId, address receiver, uint96 bps);

    constructor() ERC721("ArtNFT", "ART") {}

    function mint(
        address collector,
        string memory title,
        string memory uri,
        address royaltyReceiver,
        uint96  royaltyBps
    ) external onlyOwner returns (uint256) {
        require(royaltyBps <= 10_000, "ArtNFT: royalty exceeds 100%");
        require(royaltyReceiver != address(0), "ArtNFT: zero receiver");

        uint256 id = _nextTokenId++;
        _mint(collector, id);
        _setTokenURI(id, uri);

        artPieces[id] = ArtPiece(title, block.timestamp, royaltyBps, royaltyReceiver);
        emit ArtMinted(id, title, collector);
        return id;
    }

    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "ArtNFT: not your token");
        _burn(tokenId);
        delete artPieces[tokenId];
    }

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

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorage, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}