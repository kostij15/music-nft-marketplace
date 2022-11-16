const { expect, assert } = require("chai");
const { ethers, deployments, network } = require("hardhat");
const ZeroAddress = "0x0000000000000000000000000000000000000000";

describe("Music Marketplace Tests", function () {
  let musicNftMarketplace, nft, artist, deployer, buyer;
  const LISTED_PRICE = ethers.utils.parseEther("0.2");
  const ROYALTY_FEE = ethers.utils.parseEther("0.1");
  const TOKEN_ID = 0;

  beforeEach(async function () {
    accounts = await ethers.getSigners();
    [deployer, artist, buyer] = accounts;
    const MusicNFTMarketplace = await ethers.getContractFactory(
      "MusicMarketplace",
      deployer
    );
    musicNftMarketplace = await MusicNFTMarketplace.deploy();
    const NFT = await ethers.getContractFactory("BasicNFT", deployer);
    nft = await NFT.deploy();
    await nft.mintNft();
    await nft.approve(musicNftMarketplace.address, TOKEN_ID);
  });

  describe("listItem", function () {
    it("lists item", async () => {
      let tx = await musicNftMarketplace.listItem(
        nft.address,
        TOKEN_ID,
        LISTED_PRICE
      );
      expect(tx).to.emit("ListNFT");
      let listing = await musicNftMarketplace.getListing(nft.address, TOKEN_ID);
      expect(listing.price).to.equal(LISTED_PRICE);
    });

    it("won't re-list an item currently listed", async () => {
      let tx = await musicNftMarketplace.listItem(
        nft.address,
        TOKEN_ID,
        LISTED_PRICE
      );
      await expect(
        musicNftMarketplace.listItem(nft.address, TOKEN_ID, LISTED_PRICE)
      ).to.be.revertedWith("Item is already listed");
    });

    it("won't list if you're not the onwer", async () => {
      let buyerMusicNftMarketplace = await musicNftMarketplace.connect(buyer);
      await expect(
        buyerMusicNftMarketplace.listItem(nft.address, TOKEN_ID, LISTED_PRICE)
      ).to.reverted;
    });

    it("reverts if price is listed at 0", async () => {
      await expect(
        musicNftMarketplace.listItem(nft.address, TOKEN_ID, 0)
      ).to.be.revertedWith("MusicMarketplace__PriceGreaterThanZero()");
    });
  });

  describe("updateRoyaltyFee", function () {
    it("sets royalty fee for an item", async () => {
      const UPDATED_ROYALTY_FEE = 0.05;

      let tx = await musicNftMarketplace.updateRoyaltyFee(
        nft.address,
        TOKEN_ID,
        ethers.utils.parseEther(UPDATED_ROYALTY_FEE.toString())
      );
      expect(tx).to.emit("RoyaltyFeeUpdated");

      //verifying artistInfo for nft token
      let artistInfo = await musicNftMarketplace.getArtistInfo(
        nft.address,
        TOKEN_ID
      );
      assert(artistInfo.artist === deployer.address);
      assert(
        ethers.utils.formatEther(artistInfo.royaltyFee) ===
          UPDATED_ROYALTY_FEE.toString()
      );
    });
  });

  describe("updateListing", function () {
    it("updates listing when there is a listing", async () => {
      const UPDATED_LISTING_PRICE = "0.2";

      let tx = await musicNftMarketplace.listItem(
        nft.address,
        TOKEN_ID,
        LISTED_PRICE
      );

      let updateTx = await musicNftMarketplace.updateListing(
        nft.address,
        TOKEN_ID,
        ethers.utils.parseEther(UPDATED_LISTING_PRICE)
      );

      let updatedListing = await musicNftMarketplace.getListing(
        nft.address,
        TOKEN_ID
      );

      expect(updateTx).to.emit("UpdateItem");
      expect(ethers.utils.formatEther(updatedListing.price)).to.equal(
        UPDATED_LISTING_PRICE
      );

      it("reverts if there is no listing", async () => {
        await expect(
          musicNftMarketplace.updateListing(nft.address, TOKEN_ID, LISTED_PRICE)
        ).to.be.revertedWith("Item is not listed");
      });

      it("reverts if the updated Price is less than or equal to zero", async () => {
        let tx = await musicNftMarketplace.listItem(
          nft.address,
          TOKEN_ID,
          LISTED_PRICE
        );

        await expect(
          musicNftMarketplace.updateListing(
            nft.address,
            TOKEN_ID,
            ethers.utils.parseEther("0")
          )
        ).to.revertedWith("MusicMarketplace__PriceGreaterThanZero");

        await expect(
          musicNftMarketplace.updateListing(
            nft.address,
            TOKEN_ID,
            ethers.utils.parseEther("-1")
          )
        ).to.revertedWith("MusicMarketplace__PriceGreaterThanZero");
      });

      it("won't update if anyone but owner resets it", async () => {
        let tx = await musicNftMarketplace.listItem(
          nft.address,
          TOKEN_ID,
          LISTED_PRICE
        );

        let buyerConnected = await musicNftMarketplace.connect(buyer);
        await expect(
          buyerConencted
            .updateList(nft.address, TOKEN_ID, ethers.utils.parseEther("0.3"))
            .to.revertedWith("MusicMarketplace__NotOwner")
        );
      });
    });

    describe("cancel listing", function () {
      it("cancels an active listing", async () => {
        let tx = await musicNftMarketplace.listItem(
          nft.address,
          TOKEN_ID,
          LISTED_PRICE
        );

        let canceledTx = await musicNftMarketplace.cancelListing(
          nft.address,
          TOKEN_ID
        );

        let listing = await musicNftMarketplace.getListing(
          nft.address,
          TOKEN_ID
        );

        expect(canceledTx).to.emit("DeleteItem");
        expect(listing.seller).to.equal(ZeroAddress);
      });

      it("reverts if cancled by not owner", async () => {
        let tx = await musicNftMarketplace.listItem(
          nft.address,
          TOKEN_ID,
          LISTED_PRICE
        );
        let buyerConnected = await musicNftMarketplace.connect(buyer);

        await expect(
          buyerConnected.cancelListing(nft.address, TOKEN_ID)
        ).to.be.revertedWith("MusicMarketplace__NotOwner");
      });

      it("reverts if its not listing", async () => {
        await expect(
          musicNftMarketplace.cancelListing(nft.address, TOKEN_ID)
        ).to.be.revertedWith("Item is not listed");
      });
    });

    describe("buyItem", function () {
      it("can buy a listed item", async () => {
        let tx = await musicNftMarketplace.listItem(
          nft.address,
          TOKEN_ID,
          LISTED_PRICE
        );
        let buyerConnected = await musicNftMarketplace.connect(buyer);
        let buyingTx = await buyerConnected.buyItem(nft.address, TOKEN_ID, {
          value: LISTED_PRICE,
        });
        let listing = await buyerConnected.getListing(nft.address, TOKEN_ID);
        let withdrawProceeds = await buyerConnected.getProceeds(
          deployer.address
        );
        let ownerOfNft = await nft.ownerOf(TOKEN_ID);

        //listing no longer exists
        expect(listing.seller).equals(ZeroAddress);
        expect(buyingTx).to.emit("BoughtItem");
        expect(ethers.utils.formatEther(withdrawProceeds)).equals(
          ethers.utils.formatEther(LISTED_PRICE)
        );
        expect(ownerOfNft).to.equal(buyer.address);
      });

      it("reverts if the item isn't listed", async () => {
        let buyerConnected = await musicNftMarketplace.connect(buyer);
        await expect(
          buyerConnected.buyItem(nft.address, TOKEN_ID, {
            value: LISTED_PRICE,
          })
        ).to.be.revertedWith("Item is not listed");
      });

      it("reverts if ETH value is less than listing price", async () => {
        let tx = await musicNftMarketplace.listItem(
          nft.address,
          TOKEN_ID,
          LISTED_PRICE
        );
        let buyerConnected = await musicNftMarketplace.connect(buyer);
        await expect(
          buyerConnected.buyItem(nft.address, TOKEN_ID)
        ).to.be.revertedWith("You do not have enough ETH in your wallet");
      });
    });

    describe("withdrawProceeds", function () {
      it("can withdraw proceeds", async () => {
        let tx = await musicNftMarketplace.listItem(
          nft.address,
          TOKEN_ID,
          LISTED_PRICE
        );
        let beforeSaleBalance = await ethers.provider.getBalance(
          deployer.address
        );
        beforeSaleBalance = Number(ethers.utils.formatEther(beforeSaleBalance));

        let buyerConnected = await musicNftMarketplace.connect(buyer);
        await buyerConnected.buyItem(nft.address, TOKEN_ID, {
          value: LISTED_PRICE,
        });

        const withdrawTx = await musicNftMarketplace.withdrawProceeds();

        let afterSaleBalance = await ethers.provider.getBalance(
          deployer.address
        );
        afterSaleBalance = Number(ethers.utils.formatEther(afterSaleBalance));

        expect(afterSaleBalance).to.be.greaterThanOrEqual(beforeSaleBalance);
        expect(withdrawTx).to.emit("WithdrawProceeds");
      });

      it("cannot withdraw if the proceeds are 0", async () => {
        await expect(musicNftMarketplace.withdrawProceeds()).to.be.revertedWith(
          "Exchange doesn't have enough funds cause we care"
        );
      });
    });
  });
});
