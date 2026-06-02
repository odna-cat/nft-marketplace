// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

abstract contract MyOwnable {

    // ── State ──────────────────────────────────────────────────────
    address private _owner;

    // ── Custom errors (cheaper than string reverts) ────────────────
    // Custom errors cost less gas than require("string") because
    // strings are stored and returned as bytes — errors are just selectors.
    error NotOwner(address caller);
    error ZeroAddress();
    error NotPendingOwner(address caller);

    // ── Events ─────────────────────────────────────────────────────
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);

    // ── 2-step ownership (safer than 1-step) ──────────────────────
    // If you typo the address in 1-step, ownership is gone forever.
    // 2-step: you propose → new owner must accept → transfer completes.
    address private _pendingOwner;

    // ── Constructor ────────────────────────────────────────────────
    constructor() {
        _transferOwnership(msg.sender);
    }

    // ── Modifier ───────────────────────────────────────────────────
    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner(msg.sender);
        _;
    }

    // ── Read ───────────────────────────────────────────────────────
    function owner() public view returns (address) {
        return _owner;
    }

    function pendingOwner() public view returns (address) {
        return _pendingOwner;
    }

    // ── Step 1: current owner proposes a new owner ─────────────────
    function transferOwnership(address newOwner) public onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(_owner, newOwner);
    }

    // ── Step 2: proposed owner accepts — they must call this ───────
    // Prevents accidents — new owner proves they control the address.
    function acceptOwnership() public {
        if (msg.sender != _pendingOwner) revert NotPendingOwner(msg.sender);
        _transferOwnership(msg.sender);
        _pendingOwner = address(0);
    }

    // ── Renounce: owner gives up control forever ───────────────────
    function renounceOwnership() public onlyOwner {
        _transferOwnership(address(0));
    }

    // ── Internal: shared by constructor + acceptOwnership ──────────
    function _transferOwnership(address newOwner) internal {
        address old = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(old, newOwner);
    }
}