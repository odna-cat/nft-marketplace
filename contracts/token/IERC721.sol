// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// IERC165 must come first — IERC721 extends it
interface IERC165 {
    // Every compliant contract must answer:
    // "do you support this interface?"
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 is IERC165 {

    // ── Events ─────────────────────────────────────────────────────
    // Block explorers and front-ends listen to these.
    // Indexed fields are searchable in logs.
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    // ── Core functions every ERC-721 must have ─────────────────────
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);

    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;

    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

// Receiver interface — contracts that want to accept NFTs must implement this
interface IERC721Receiver {
    // Must return 0x150b7a02 to confirm it can handle ERC-721 tokens
    // Returning anything else causes safeTransferFrom to revert
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

// Optional metadata extension
interface IERC721Metadata is IERC721 {
    function name()     external view returns (string memory);
    function symbol()   external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}