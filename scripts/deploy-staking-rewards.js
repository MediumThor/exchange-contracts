const { ethers } = require('hardhat');

const { ARC_ADDRESS, WAVAX_ADDRESS } = require("../constants/avalanche_fuji.js");

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const rewardsTokenAddress = ethers.utils.getAddress("0xA860A0D97c8f9DF02C57587fbA02DBd552a97a63");
    const stakingTokenAddress = ethers.utils.getAddress("0xA860A0D97c8f9DF02C57587fbA02DBd552a97a63");

    // Deploy StakingRewards
    const StakingRewards = await ethers.getContractFactory("StakingRewards");
    const stakingRewards = await StakingRewards.deploy(
        rewardsTokenAddress,
        stakingTokenAddress,
    );
    await stakingRewards.deployed();

    console.log("StakingRewards address: ", stakingRewards.address);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
