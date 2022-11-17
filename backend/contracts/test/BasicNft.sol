// SPDX License-Identifier: MIT

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

pragma solidity ^0.8.7;

//we'll be using open zepplin contracts
contract BasicNFT is ERC721, Ownable {
    using Strings for uint256;
    //_safeMint takes a parameter tokenId, which references each NFT token's unique id
    //we will need to add a private variable that represents tokenId
    uint256 private s_tokenCounter;

    //Mapping for token Ids to token URIs
    mapping(uint256 => string) private _tokenURIs;

    //Base URI
    string private baseURIextended;

    //modifiers
    modifier tokenExists(uint256 tokenId) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI set of nonexistent token"
        );
        _;
    }

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {}

    function mintNft() public returns (uint256) {
        _safeMint(msg.sender, s_tokenCounter);
        s_tokenCounter = s_tokenCounter + 1;
        return s_tokenCounter;
    }

    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURIextended = _baseURI;
    }

    function _setTokenURI(uint256 tokenId, string memory _tokenURI)
        internal
        virtual
        tokenExists(tokenId)
    {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI set of nonexistent token"
        );
        _tokenURIs[tokenId] = _tokenURI;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        tokenExists(tokenId)
        returns (string memory)
    {
        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        //no base return token URI
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        //if both are set, concatenate the two
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }
        //if theres a base URI but no token URI, concatenate both
        return string(abi.encodePacked(base, tokenId.toString()));
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }
}
