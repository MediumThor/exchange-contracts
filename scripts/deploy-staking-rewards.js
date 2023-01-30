const { ethers } = require('hardhat');

const { ARC_ADDRESS, WAVAX_ADDRESS } = require("../constants/avalanche_fuji.js");

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const rewardsTokenAddress = ethers.utils.getAddress("0xBBfeDb04Cc7d030d29Cc34dd0081f062C4C78818");
    const stakingTokenAddress = ethers.utils.getAddress("0xe963CCCD8f5b076d70a85234E68E321e9040da17");

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
