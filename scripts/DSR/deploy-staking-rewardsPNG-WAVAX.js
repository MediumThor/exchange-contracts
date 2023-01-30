const { ethers } = require('hardhat');

const { ARC_ADDRESS, WAVAX_ADDRESS } = require("../../constants/fuji.js");

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const rewardsTokenAddress = ethers.utils.getAddress(ARC_ADDRESS);
    const stakingTokenAddress = ethers.utils.getAddress("0x7fEb6935427bdB00d35527bA51F2712b90d4dfc5");

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
