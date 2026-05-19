// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./EIP2981.sol";                 

contract RoyaltyNFT is ERC721, EIP2981, Ownable {

    uint256 private _nextTokenId;

    constructor()
        ERC721("FractionalNFT", "FNFT")
        Ownable(msg.sender)
    {}

    // ── Mint with royalty attached ─────────────────────────────────
    function mint(
        address to,
        address splitter,   // PaymentSplitter address
        uint96  feeBps      // e.g. 1000 = 10%
    ) external onlyOwner returns (uint256) {
        uint256 id = _nextTokenId++;
        _safeMint(to, id);
        _setTokenRoyalty(id, splitter, feeBps);  // defined in EIP2981.sol
        return id;
    }

    // ── Update royalty after minting (optional) ────────────────────
    function updateRoyalty(
        uint256 tokenId,
        address splitter,
        uint96  feeBps
    ) external onlyOwner {
        _setTokenRoyalty(tokenId, splitter, feeBps);
    }

    // ── ERC-165: merge both parent interfaces ──────────────────────
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, EIP2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
