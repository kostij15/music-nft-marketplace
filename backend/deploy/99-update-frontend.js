const { ethers, network } = require("hardhat");
const fs = require("fs");

const frontEndContractFilePath = "../frontend/constants/networkMapping.json";

module.exports = async function () {
  if (process.env.UPDATE_FRONT_END) {
    console.log("updating front end...");
    await updateContractAddress();
  }
};

async function updateContractAddress() {
  const musicMarketplace = await ethers.getContractFactory("MusicMarketplace");
  const chainId = network.config.chainId.toString();
  const contractAddresses = JSON.parse(
    fs.readFileSync(frontEndContractFilePath, "utf8")
  );

  if (chainId in contractAddresses) {
    if (
      !contractAddresses[chainId]["MusicMarketplace"].includes(
        musicMarketplace.address
      )
    ) {
      contractAddresses[chainId]["MusicMarketplace"].push(
        musicMarketplace.address
      );
    }
  } else {
    contractAddresses[chainId] = {
      MusicMarketplace: [musicMarketplace.address],
    };
  }
  fs.writeFileSync(frontEndContractFilePath, JSON.stringify(contractAddresses));
}

module.exports.tags = ["all", "frontend"];
