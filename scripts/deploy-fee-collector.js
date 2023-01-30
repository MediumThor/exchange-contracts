const { ethers } = require('hardhat');

const STAKING_CONTRACT = "0xbC5F072D9f797d9Ad059ddf80F21Dd8a00126Ee5";
const MULTISIG = "0x969dc8356E5F1b3AB4a64122D3A717b26b1794aa"; // gnosis
const FACTORY = "0x3fa40630cCBe6920Ba6A5971984C7304304C996d";
const MINICHEF = "0x62AE08E2684ee1501B940B1167ecc9af95De6c9f";
const GOVERNOR = "0x632e9ab236Aa8d5483E04Abac407C6b6D5e1d6bC"; // timelock
const WAVAX = "0xd00ae08403B9bbb9124bB305C09058E32C39A48c";

async function main() {

    // Deploy Fee Collector
    const FeeCollector = await ethers.getContractFactory("FeeCollector");
    const feeCollector = await FeeCollector.deploy(
        WAVAX,
        FACTORY,
        "0x40231f6b438bce0797c9ada29b718a87ea0a5cea3fe9a771abdd76bd41a3e545", // init pair hash
        STAKING_CONTRACT,
        MINICHEF,
        0, // chef pid for dummy ARL
        MULTISIG, // “treasury” fees
        GOVERNOR, // timelock
        MULTISIG // admin
    );
    await feeCollector.deployed();
    console.log("Fee Collector deployed at: " + feeCollector.address);

    // Deploy DummyERC20 for diverting some ARC emissions to ARC staking
    const DummyERC20 = await ethers.getContractFactory("DummyERC20");
    const dummyERC20 = await DummyERC20.deploy(
        "Dummy ERC20",
        "ARL",
        MULTISIG,
        100 // arbitrary amount
    );
    await dummyERC20.deployed();
    await dummyERC20.transferOwnership(MULTISIG);
    console.log("Dummy ARL for Fee Collector deployed at: " + dummyERC20.address);

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
