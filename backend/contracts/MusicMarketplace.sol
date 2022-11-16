// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

error MusicMarketplace__NotOwner();
error MusicMarketplace__PriceGreaterThanZero();
error MusicMarketplace__NotArtist();

contract MusicMarketplace is ReentrancyGuard {
    //events
    event RoyaltyFeeUpdated(
        address indexed artistAddress,
        uint256 indexed _tokenId,
        uint256 _royaltyFee
    );

    event ListItem(
        address indexed listerAddress,
        address indexed nftAddress,
        uint256 indexed _tokenId,
        uint256 _price
    );

    event BoughtItem(
        address indexed buyerAddress,
        address indexed nftAddress,
        uint256 indexed _tokenId,
        uint256 _price
    );

    event UpdateItem(
        address indexed updateAddress,
        address indexed nftAddress,
        uint256 indexed _tokenId,
        uint256 updatedPrice
    );

    event DeleteItem(
        address indexed updateAddress,
        address indexed nftAddress,
        uint256 indexed _tokenId
    );

    event WithdrawProceeds(
        address indexed _address
    );

    //structs
    struct Listing {
        address seller;
        uint256 price;
    }
    struct ArtistInfo {
        address artist;
        uint256 royaltyFee;
        bool active;
    }

    //mapping
    mapping(address => mapping(uint256 => Listing)) listings;
    mapping(address => mapping(uint256 => ArtistInfo)) tokenToArtist;
    mapping(address => uint256) userToProceeds;

    //modifiers
    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nftToken = IERC721(nftAddress);
        address owner = nftToken.ownerOf(tokenId);
        if (spender != owner) {
            revert MusicMarketplace__NotOwner();
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = listings[nftAddress][tokenId];
        require(listing.price <= 0, "Item is already listed");
        _;
    }

    modifier isNotListed(address nftAddress, uint256 tokenId) {
        Listing memory listedValue = listings[nftAddress][tokenId];
        require(listedValue.price > 0, "Item is not listed");
        _;
    }

    modifier isPriceGreaterThanZero(uint256 _price) {
        if (_price <= 0) {
            revert MusicMarketplace__PriceGreaterThanZero();
        }
        _;
    }

    modifier isArtist(address nftAddress, uint256 tokenId) {
        ArtistInfo memory artistInfo = tokenToArtist[nftAddress][tokenId];
        if (artistInfo.active == true && artistInfo.artist != msg.sender) {
            revert MusicMarketplace__NotArtist();
        }
        _;
    }

    function updateRoyaltyFee(
        address nftAddress,
        uint256 tokenId,
        uint256 royaltyFee
    ) external isArtist(nftAddress, tokenId) {
        ArtistInfo storage artistInfo = tokenToArtist[nftAddress][tokenId];
        if (artistInfo.active == false) {
            tokenToArtist[nftAddress][tokenId] = ArtistInfo(
                msg.sender,
                royaltyFee,
                true
            );
        } else {
            artistInfo.royaltyFee = royaltyFee;
        }
        emit RoyaltyFeeUpdated(msg.sender, tokenId, royaltyFee);
    }

    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
        isPriceGreaterThanZero(price)
    {
        listings[nftAddress][tokenId] = Listing(msg.sender, price);
        emit ListItem(msg.sender, nftAddress, tokenId, price);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 updatedPrice
    )
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isNotListed(nftAddress, tokenId)
        isPriceGreaterThanZero(updatedPrice)
    {
        listings[nftAddress][tokenId] = Listing(msg.sender, updatedPrice);
        emit UpdateItem(msg.sender, nftAddress, tokenId, updatedPrice);
    }

    function cancelListing(address nftAddress, uint256 tokenId)
        external
        isOwner(nftAddress, tokenId, msg.sender)
        isNotListed(nftAddress, tokenId)
    {
        delete listings[nftAddress][tokenId];
        emit DeleteItem(msg.sender, nftAddress, tokenId);
    }

    //Buying function
    function buyItem(address nftAddress, uint256 tokenId)
        external
        payable
        isNotListed(nftAddress, tokenId)
    {
        Listing memory itemListing = listings[nftAddress][tokenId];
        uint256 price = itemListing.price;
        address sellerAddress = itemListing.seller;

        //transfer eth funds
        require(
            msg.value >= price,
            "You do not have enough ETH in your wallet"
        );

        //delete lsitings
        delete listings[nftAddress][tokenId];

        //transfer nft
        IERC721 nft = IERC721(nftAddress);
        nft.safeTransferFrom(sellerAddress, msg.sender, tokenId);

        //add fund to procceeds
        userToProceeds[sellerAddress] = price;
        emit BoughtItem(msg.sender, nftAddress, tokenId, price);
    }

    function withdrawProceeds() external payable {
        uint256 proceeds = userToProceeds[msg.sender];
        require(
            (address(this).balance >= proceeds && proceeds > 0),
            "Exchange doesn't have enough funds cause we care"
        );
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        require(success, "Transfer didn't go through");
        emit WithdrawProceeds(msg.sender);
    }

    //getter functions
    function getListing(address nftAddress, uint256 tokenId)
        external
        view
        returns (Listing memory)
    {
        return listings[nftAddress][tokenId];
    }

    function getArtistInfo(address nftAddress, uint256 tokenId)
        external
        view
        returns (ArtistInfo memory)
    {
        return tokenToArtist[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return userToProceeds[seller];
    }
}
