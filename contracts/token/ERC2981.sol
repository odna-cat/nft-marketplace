// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";

abstract contract EIP2981 is ERC165, IERC2981 {

    struct RoyaltyInfo {
        address receiver;
        uint96  feeBps;      // basis points e.g. 1000 = 10%
    }

    mapping(uint256 => RoyaltyInfo) private _tokenRoyalties;

    // ── Set royalty for a specific token ──────────────────────────
    function _setTokenRoyalty(
        uint256 tokenId,
        address receiver,
        uint96  feeBps
    ) internal virtual {
        require(feeBps <= 10_000, "Royalty exceeds 100%");
        require(receiver != address(0), "Invalid receiver");
        _tokenRoyalties[tokenId] = RoyaltyInfo(receiver, feeBps);
    }

    // ── Delete royalty (optional utility) ─────────────────────────
    function _resetTokenRoyalty(uint256 tokenId) internal virtual {
        delete _tokenRoyalties[tokenId];
    }

    // ── EIP-2981 interface ─────────────────────────────────────────
    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view override returns (address receiver, uint256 royaltyAmount) {
        RoyaltyInfo memory r = _tokenRoyalties[tokenId];
        return (r.receiver, (salePrice * r.feeBps) / 10_000);
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