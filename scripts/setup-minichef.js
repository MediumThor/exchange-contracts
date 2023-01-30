const { ethers, network } = require('hardhat');

const {
    PNG_ADDRESS,
    TREASURY_VESTER_ADDRESS,
    COMMUNITY_TREASURY_ADDRESS,
    TIMELOCK_ADDRESS,
    GOVERNOR_ADDRESS,
    PANGOLIN_MULTISIG,
} = require("../testnet-constants.js");
const { BigNumber } = require('ethers');



const TWO_MILLION_PNG = BigNumber.from('2000000' + '0'.repeat(18));

const poolConfig = [
    [3000, '0xFD2d075D2143a8979C97cBFC3445908AB0c0E1Be'], // WAVAX-ARC

];


async function main() {

    const [deployer, user1] = await ethers.getSigners();

    const ARC = await ethers.getContractFactory("Png");
    const arc = await ARC.attach(PNG_ADDRESS);

    // Large ARC holder
    const acc = '0x969dc8356e5f1b3ab4a64122d3a717b26b1794aa';



    const pngWhale = await ethers.provider.getSigner(acc);



    // Self delegate


    console.log("Deploying contracts with the account:", deployer.address);

    const GovernorAlpha = await ethers.getContractFactory("GovernorAlpha");
    const governorAlpha = await GovernorAlpha.attach(GOVERNOR_ADDRESS);

    const CommunityTreasury = await ethers.getContractFactory("CommunityTreasury");
    const communityTreasury = await CommunityTreasury.attach(COMMUNITY_TREASURY_ADDRESS);

    const TreasuryVester = await ethers.getContractFactory("TreasuryVester");
    const treasuryVester = await TreasuryVester.attach(TREASURY_VESTER_ADDRESS);

    // Deploy MiniChefV2
    const MiniChef = await ethers.getContractFactory("MiniChefV2");
    const miniChef = await MiniChef.deploy(
        arc.address,
        deployer.address,
    );
    await miniChef.deployed();
    console.log("Deployed MiniChefV2:", miniChef.address);

    // Deploy TreasuryVesterProxy


    // Add funder
    console.log(`Adding funders`);
    await miniChef.addFunder(treasuryVester.address);
    console.log(`Done`);

    // Set owners to timelock
    console.log(`Setting owners`);
    await miniChef.transferOwnership(TIMELOCK_ADDRESS);
    console.log(`Done`);

    // Governance proposal
    const targets = [
        communityTreasury.address, // transfer
        arc.address, // approve
        treasuryVester.address, // setRecipient
        miniChef.address, // fundRewards
        miniChef.address, // create pools
        miniChef.address, // transferOwnership
    ];
    const values = [0, 0, 0, 0, 0, 0, 0];
    const sigs = [
        'transfer(address,uint256)',
        'approve(address,uint256)',
        'setRecipient(address)',
        'init()',
        'fundRewards(uint256,uint256)',
        'addPools(uint256[],address[],address[])',
        'transferOwnership(address)'
    ];
    const callDatas = [
        ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [TIMELOCK_ADDRESS, TWO_MILLION_PNG]),
        ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [miniChef.address, TWO_MILLION_PNG]),
        0, // empty bytes
        ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256'], [TWO_MILLION_PNG, 30 * 86400]),
        ethers.utils.defaultAbiCoder.encode(['uint256[]', 'address[]', 'address[]'], [
            poolConfig.map(entry => entry[0]),
            poolConfig.map(entry => entry[1]),
            poolConfig.map(entry => ethers.constants.AddressZero)
        ]),
        ethers.utils.defaultAbiCoder.encode(['address'], [PANGOLIN_MULTISIG])
    ];

    const description =
        `# Pangolin V2 and The New Tokenomics
TLDR: Implement Pangolin tokenomics change with improved farming system

## What is the goal?
Pangolin is moving to a significantly improved tokenomics system allowing the protocol to best compete with other DEXes on Avalanche and strategically allocate rewards to liquidity providers! 

## What is changing?
The system powering farming rewards will require one final migration and will receive boosted rewards for the first 30 days to compensate farmers for the transition. 

This will shorten the total token emission period because emitting ARC over 28 years is too long of a timeframe for DeFi. The diluted market cap of Pangolin will change from 530m ARC to 230m ARC over the course of approximately 3 years from now. 

This will also grow the treasury from 13m ARC to 30m ARC over the course of 29 months, enabling Pangolin to further innovate and continue to add new features and improve the user experience.
 
The farming pools will be focused to 37 farms at launch and can still be amended by the community via the Pangolin multisig.

## How does this impact users?
Users will benefit from increased rewards and more competitive farms. 

Users will need to take a single action and migrate their funds from the current farm into the new farm (note: this will need to be done for each pool a user is in).

## Technical Proposal
We will deploy MiniChefV2 which will manage the farming rewards. 

We will implement TreasuryVesterProxy around the TreasuryVester that will divert funds over the course of 960 days to farming rewards, the treasury, and burning excess ARC. 

We will transfer 2M ARC from CommunityTreasury to MiniChefV2 boosting the first 30 days of the new rewards system. 

We will add 37 farming pools with their respective weights.`;

    console.log(`Submitting proposal`);
    await governorAlpha.connect(pngWhale).propose(targets, values, sigs, callDatas, description);

    const proposalNumber = await governorAlpha.proposalCount();
    console.log(`Made proposal #${proposalNumber}`);

    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");

    console.log(`Voting yes on proposal #${proposalNumber}`);
    await governorAlpha.connect(pngWhale).castVote(proposalNumber, true);
    console.log('Done');

    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine");

    console.log(`Queuing proposal #${proposalNumber}`);
    await governorAlpha.queue(proposalNumber);
    console.log('Done');

    await ethers.provider.send("evm_increaseTime", [86400 * 2]);
    await ethers.provider.send("evm_mine");

    console.log(`Executing proposal #${proposalNumber}`);
    await governorAlpha.execute(
        proposalNumber,
        {
            gasLimit: 7000000
        }
    );
    console.log('Done');
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
