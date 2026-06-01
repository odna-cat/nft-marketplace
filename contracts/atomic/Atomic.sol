// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IRoyaltyNFT {
    struct RoyaltyInfo {
        address receiver;
        uint96 feeNumerator; // basis points (10000 = 100%)
    }

    function getRoyalties(
        uint256 tokenId
    ) external view returns (RoyaltyInfo[] memory);
}

contract NFTMarketplace is ReentrancyGuard {

    // structs
    struct Listing {
        address seller;
        uint256 price;
    }

    // STATE VARIABLES

    //nft address => tokenId => Listing//
    mapping(address => mapping(uint256 => Listing))
        public listings;

    /*Pull-payment balances*/
    mapping(address => uint256)
        public pendingWithdrawals;

    uint96 private constant FEE_DENOMINATOR = 10000;

    // events
    event NFTListed(
        address indexed seller,
        address indexed nft,
        uint256 indexed tokenId,
        uint256 price
    );

    event NFTSold(
        address indexed buyer,
        address indexed seller,
        address indexed nft,
        uint256 tokenId,
        uint256 price
    );

    event RoyaltyAccrued(
        address indexed receiver,
        uint256 amount
    );

    event Withdrawal(
        address indexed user,
        uint256 amount
    );

    event ListingCancelled(
        address indexed seller,
        address indexed nft,
        uint256 indexed tokenId
    );

    // list nft
    function listNFT(
        address nft,
        uint256 tokenId,
        uint256 price
    ) external {

        require(price > 0, "Price must be > 0");

        IERC721 nftContract = IERC721(nft);

        // Verify ownership
        require(
            nftContract.ownerOf(tokenId) == msg.sender,
            "Not NFT owner"
        );

        // Verify marketplace approval
        require(
            nftContract.getApproved(tokenId) == address(this)
            ||
            nftContract.isApprovedForAll(
                msg.sender,
                address(this)
            ),
            "Marketplace not approved"
        );

        listings[nft][tokenId] = Listing({
            seller: msg.sender,
            price: price
        });

        emit NFTListed(
            msg.sender,
            nft,
            tokenId,
            price
        );
    }

    // buy nft (atomic swap)
    function buyNFT(
        address nft,
        uint256 tokenId
    )
        external
        payable
        nonReentrant
    {

        Listing memory item =
            listings[nft][tokenId];

        // CHECKS
        require(
            item.price > 0,
            "NFT not listed"
        );

        require(
            msg.value == item.price,
            "Incorrect ETH amount"
        );

        IERC721 nftContract = IERC721(nft);

        // Re-check ownership
        require(
            nftContract.ownerOf(tokenId)
                == item.seller,
            "Seller no longer owner"
        );

        // Re-check approval
        require(
            nftContract.getApproved(tokenId)
                == address(this)
            ||
            nftContract.isApprovedForAll(
                item.seller,
                address(this)
            ),
            "Marketplace not approved"
        );

        // effects
        uint256 totalRoyalty;

        IRoyaltyNFT royaltyNFT =
            IRoyaltyNFT(nft);

        IRoyaltyNFT.RoyaltyInfo[]
            memory royalties =
                royaltyNFT.getRoyalties(tokenId);

        // Calculate royalties
        for (uint256 i = 0; i < royalties.length; i++) {

            uint256 royaltyAmount =
                (msg.value *
                    royalties[i].feeNumerator)
                    / FEE_DENOMINATOR;

            totalRoyalty += royaltyAmount;

            pendingWithdrawals[
                royalties[i].receiver
            ] += royaltyAmount;

            emit RoyaltyAccrued(
                royalties[i].receiver,
                royaltyAmount
            );
        }

        uint256 sellerAmount =
            msg.value - totalRoyalty;

        pendingWithdrawals[
            item.seller
        ] += sellerAmount;

        // Remove listing BEFORE transfer
        delete listings[nft][tokenId];

        // interactions
        /*
            Atomic NFT transfer.If this fails:
            - ALL royalty balances revert
            - seller payment reverts
            - listing deletion reverts
        */
        nftContract.safeTransferFrom(
            item.seller,
            msg.sender,
            tokenId
        );

        emit NFTSold(
            msg.sender,
            item.seller,
            nft,
            tokenId,
            msg.value
        );
    }

    // withdraw funds
    function withdraw()
        external
        nonReentrant
    {

        uint256 amount =
            pendingWithdrawals[msg.sender];

        require(
            amount > 0,
            "No funds available"
        );

        // effects
        pendingWithdrawals[msg.sender] = 0;

        // interactions
        (bool success, ) =
            payable(msg.sender).call{
                value: amount
            }("");

        require(
            success,
            "ETH transfer failed"
        );

        emit Withdrawal(
            msg.sender,
            amount
        );
    }

    // cancel listing

    function cancelListing(
        address nft,
        uint256 tokenId
    ) external {

        Listing memory item =
            listings[nft][tokenId];

        require(
            item.seller == msg.sender,
            "Not seller"
        );

        delete listings[nft][tokenId];

        emit ListingCancelled(
            msg.sender,
            nft,
            tokenId
        );
    }

    // view functions
    function getListing(
        address nft,
        uint256 tokenId
    )
        external
        view
        returns (Listing memory)
    {
        return listings[nft][tokenId];
    }

    function getPendingBalance(
        address user
    )
        external
        view
        returns (uint256)
    {
        return pendingWithdrawals[user];
    }
}