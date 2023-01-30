const { ethers } = require('hardhat');

const { ARC_ADDRESS, MINICHEF_V2_ADDRESS } = require("./mainnet-constants");

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const initBalance = await deployer.getBalance();
    console.log("Account balance:", initBalance.toString());

    const arc = ethers.utils.getAddress(ARC_ADDRESS);
    const miniChefV2 = ethers.utils.getAddress(MINICHEF_V2_ADDRESS);

    // Deploy ArcanumVoteCalculator
    const ArcanumVoteCalculator = await ethers.getContractFactory("ArcanumVoteCalculator");
    const arcanumVoteCalculator = await ArcanumVoteCalculator.deploy(
        arc,
        miniChefV2,
    );
    await arcanumVoteCalculator.deployed();

    console.log("ArcanumVoteCalculator address: ", arcanumVoteCalculator.address);

    const endBalance = await deployer.getBalance();
    console.log("Deploy cost: ", initBalance.sub(endBalance).toString());
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
