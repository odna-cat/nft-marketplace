// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC721.sol";

// Implements IERC721Metadata — the full standard including name/symbol/tokenURI
abstract contract MyERC721 is IERC721Metadata {

    // ── Custom errors ──────────────────────────────────────────────
    error NonExistentToken(uint256 tokenId);
    error NotApprovedOrOwner(address caller);
    error TransferToZeroAddress();
    error MintToZeroAddress();
    error TokenAlreadyExists(uint256 tokenId);
    error NotERC721Receiver(address to);
    error SelfApproval();

    // ── Metadata ───────────────────────────────────────────────────
    string private _name;
    string private _symbol;

    // ── Core storage ───────────────────────────────────────────────
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string)  private _tokenURIs;

    // ── Constructor ────────────────────────────────────────────────
    constructor(string memory name_, string memory symbol_) {
        _name   = name_;
        _symbol = symbol_;
    }

    // ── IERC165 ────────────────────────────────────────────────────
    // Returns true for all 3 interface IDs this contract satisfies.
    function supportsInterface(bytes4 interfaceId)
        public view virtual override
        returns (bool)
    {
        return
            interfaceId == type(IERC721).interfaceId         ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }

    // ── IERC721Metadata ────────────────────────────────────────────
    function name()   public view override returns (string memory) { return _name; }
    function symbol() public view override returns (string memory) { return _symbol; }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_owners[tokenId] == address(0)) revert NonExistentToken(tokenId);
        return _tokenURIs[tokenId];
    }

    // ── IERC721: read ──────────────────────────────────────────────
    function balanceOf(address owner) public view override returns (uint256) {
        if (owner == address(0)) revert TransferToZeroAddress();
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = _owners[tokenId];
        if (owner == address(0)) revert NonExistentToken(tokenId);
        return owner;
    }

    // ── IERC721: approvals ─────────────────────────────────────────
    function approve(address to, uint256 tokenId) public override {
        address owner = ownerOf(tokenId);
        // Only the owner OR an operator can approve
        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender))
            revert NotApprovedOrOwner(msg.sender);
        _tokenApprovals[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        if (_owners[tokenId] == address(0)) revert NonExistentToken(tokenId);
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) public override {
        // Can't approve yourself — pointless and a known attack vector
        if (operator == msg.sender) revert SelfApproval();
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator)
        public view override returns (bool)
    {
        return _operatorApprovals[owner][operator];
    }

    // ── IERC721: transfers ─────────────────────────────────────────
    function transferFrom(address from, address to, uint256 tokenId)
        public override
    {
        if (!_isApprovedOrOwner(msg.sender, tokenId))
            revert NotApprovedOrOwner(msg.sender);
        _transfer(from, to, tokenId);
    }

    // safeTransferFrom without data
    function safeTransferFrom(address from, address to, uint256 tokenId)
        public override
    {
        safeTransferFrom(from, to, tokenId, "");
    }

    // safeTransferFrom with data — the full version both above call
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data)
        public override
    {
        if (!_isApprovedOrOwner(msg.sender, tokenId))
            revert NotApprovedOrOwner(msg.sender);
        _transfer(from, to, tokenId);
        // Extra safety check — confirm receiver can handle ERC-721
        if (!_checkOnERC721Received(msg.sender, from, to, tokenId, data))
            revert NotERC721Receiver(to);
    }

    // ── Internal helpers ───────────────────────────────────────────
    function _isApprovedOrOwner(address spender, uint256 tokenId)
        internal view returns (bool)
    {
        address owner = ownerOf(tokenId);
        return (
            spender == owner ||
            getApproved(tokenId) == spender ||
            isApprovedForAll(owner, spender)
        );
    }

    function _transfer(address from, address to, uint256 tokenId) internal {
        if (ownerOf(tokenId) != from) revert NotApprovedOrOwner(from);
        if (to == address(0)) revert TransferToZeroAddress();

        // Clear single-token approval — approvals don't survive transfers
        delete _tokenApprovals[tokenId];

        unchecked {
            // unchecked: balances can never overflow — total supply is bounded
            _balances[from] -= 1;
            _balances[to]   += 1;
        }
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    // Create new token — child contracts call this
    function _mint(address to, uint256 tokenId, string memory uri) internal {
        if (to == address(0)) revert MintToZeroAddress();
        if (_owners[tokenId] != address(0)) revert TokenAlreadyExists(tokenId);

        unchecked { _balances[to] += 1; }
        _owners[tokenId]   = to;
        _tokenURIs[tokenId] = uri;

        // Transfer FROM address(0) = mint convention
        emit Transfer(address(0), to, tokenId);
    }

    // Destroy token — child contracts call this
    function _burn(uint256 tokenId) internal {
        address owner = ownerOf(tokenId);
        delete _tokenApprovals[tokenId];
        unchecked { _balances[owner] -= 1; }
        delete _owners[tokenId];
        delete _tokenURIs[tokenId];

        // Transfer TO address(0) = burn convention
        emit Transfer(owner, address(0), tokenId);
    }

    // Check if contract receiver can handle ERC-721
    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private returns (bool) {
        // Regular wallet (no code) → always safe
        if (to.code.length == 0) return true;

        // Contract receiver → must implement onERC721Received
        try IERC721Receiver(to).onERC721Received(operator, from, tokenId, data)
            returns (bytes4 retval)
        {
            // Must return the magic selector to confirm support
            return retval == IERC721Receiver.onERC721Received.selector;
        } catch {
            return false;
        }
    }
}