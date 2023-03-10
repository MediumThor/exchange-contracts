// test/Airdrop.js
// Load dependencies
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const { ethers } = require('hardhat');

const UNPRIVILEGED_ADDRESS = ethers.Wallet.createRandom().address;
const TREASURY = ethers.Wallet.createRandom().address;

const AIRDROP_SUPPLY = ethers.utils.parseUnits("11500000", 18);
const TOTAL_SUPPLY = ethers.utils.parseUnits("230000000", 18);
const ONE_TOKEN = ethers.utils.parseUnits("1", 18);

// Start test block
describe('Airdrop', function () {
    before(async function () {
        [this.admin,] = await ethers.getSigners();
        this.Airdrop = await ethers.getContractFactory("Airdrop");
        this.ARC = await ethers.getContractFactory("Arc");
    });

    beforeEach(async function () {
        this.arc = await this.ARC.deploy(TOTAL_SUPPLY, AIRDROP_SUPPLY, "ARC", "Arcanum");
        await this.arc.deployed();
        this.airdrop = await this.Airdrop.deploy(AIRDROP_SUPPLY, this.arc.address, this.admin.address, TREASURY);
        await this.airdrop.deployed();

    });

    // Test cases

    //////////////////////////////
    //       Constructor
    //////////////////////////////
    describe("Constructor", function () {
        it('airdrop supply', async function () {
            expect((await this.airdrop.airdropSupply())).to.equal(AIRDROP_SUPPLY);
        });
        it('arc address', async function () {
            expect((await this.airdrop.arc())).to.equal(this.arc.address);
        });
        it('owner address', async function () {
            expect((await this.airdrop.owner())).to.equal(this.admin.address);
        });
        it('remainderDestination address', async function () {
            expect((await this.airdrop.remainderDestination())).to.equal(TREASURY);
        });
        it('claiming default', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
        });
        it('totalAllocated default', async function () {
            expect((await this.airdrop.totalAllocated())).to.equal(0);
        });
    });

    //////////////////////////////
    //  setRemainderDestination
    //////////////////////////////
    describe("setRemainderDestination", function () {
        it('set remainder successfully', async function () {
            expect((await this.airdrop.remainderDestination())).to.not.equal(UNPRIVILEGED_ADDRESS);
            await this.airdrop.setRemainderDestination(UNPRIVILEGED_ADDRESS);
            expect((await this.airdrop.remainderDestination())).to.equal(UNPRIVILEGED_ADDRESS);
        });

        it('set remainder unsuccessfully', async function () {
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.setRemainderDestination(altAddr.getAddress())).to.be.revertedWith(
                "Airdrop::setRemainderDestination: unauthorized");
        });
    });

    //////////////////////////////
    //     setOwner
    //////////////////////////////
    describe("setOwner", function () {
        it('set owner successfully', async function () {
            expect((await this.airdrop.owner())).to.not.equal(UNPRIVILEGED_ADDRESS);
            await this.airdrop.setOwner(UNPRIVILEGED_ADDRESS);
            expect((await this.airdrop.owner())).to.equal(UNPRIVILEGED_ADDRESS);
        });

        it('set owner unsuccessfully', async function () {
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.setOwner(altAddr.getAddress())).to.be.revertedWith(
                "Airdrop::setOwner: unauthorized");
        });
    });

    //////////////////////////////
    //     setWhitelister
    //////////////////////////////
    describe("setWhitelister", function () {
        it('set whitelister successfully', async function () {
            expect((await this.airdrop.whitelister())).to.not.equal(UNPRIVILEGED_ADDRESS);
            await this.airdrop.setWhitelister(UNPRIVILEGED_ADDRESS);
            expect((await this.airdrop.whitelister())).to.equal(UNPRIVILEGED_ADDRESS);
        });

        it('set whitelister unsuccessfully', async function () {
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.setWhitelister(altAddr.getAddress())).to.be.revertedWith(
                "Airdrop::setWhitelister: unauthorized");
        });
    });

    //////////////////////////////
    //     setAirdropSupply
    //////////////////////////////
    describe("setAirdropSupply", function () {
        it('set airdropSupply successfully', async function () {
            const newAirdropSupply = AIRDROP_SUPPLY.add(500000);
            expect((await this.airdrop.airdropSupply())).to.equal(AIRDROP_SUPPLY);

            await this.airdrop.setAirdropSupply(newAirdropSupply);
            expect((await this.airdrop.airdropSupply())).to.equal(newAirdropSupply);
        });

        it('unauthorized call', async function () {
            const newAirdropSupply = AIRDROP_SUPPLY.add(500000);

            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.setAirdropSupply(newAirdropSupply)).to.be.revertedWith(
                "Airdrop::setAirdropSupply: unauthorized");
        });

        it('less airdrop amount than already allocated', async function () {
            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);
            await this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS], [AIRDROP_SUPPLY]);

            expect((await this.airdrop.airdropSupply())).to.equal(AIRDROP_SUPPLY);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(AIRDROP_SUPPLY);
            await expect(this.airdrop.setAirdropSupply(AIRDROP_SUPPLY.sub(1))).to.be.revertedWith(
                "Airdrop::setAirdropSupply: supply less than total allocated");
        });

        it('claiming in session', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);

            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();

            expect((await this.airdrop.claimingAllowed())).to.be.true;

            const newAirdropSupply = AIRDROP_SUPPLY.add(500000);
            expect((await this.airdrop.airdropSupply())).to.equal(AIRDROP_SUPPLY);
            await expect(this.airdrop.setAirdropSupply(newAirdropSupply)).to.be.revertedWith(
                "Airdrop::setAirdropSupply: claiming in session");
        });

    });

    //////////////////////////////
    //     allowClaiming
    //////////////////////////////
    describe("allowClaiming", function () {
        it('set claiming successfully', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;
        });

        it('ClaimingAllowed emitted', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);

            await expect(this.airdrop.allowClaiming()).to.emit(this.airdrop, 'ClaimingAllowed')
        });

        it('set claiming insufficient ARC', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await expect(this.airdrop.allowClaiming()).to.be.revertedWith(
                'Airdrop::allowClaiming: incorrect ARC supply');
        });

        it('set claiming unathorized', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);

            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.allowClaiming()).to.be.revertedWith(
                'Airdrop::allowClaiming: unauthorized');
        });

        it('set claiming unathorized and insufficient ARC', async function () {
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.allowClaiming()).to.be.revertedWith(
                'Airdrop::allowClaiming: incorrect ARC supply');
        });
    });

    //////////////////////////////
    //       endClaiming
    //////////////////////////////
    describe("endClaiming", function () {
        it('end claiming successfully', async function () {
            // allow claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // end claiming
            expect(await this.arc.balanceOf(TREASURY)).to.equal(0);
            await this.airdrop.endClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            expect(await this.arc.balanceOf(TREASURY)).to.equal(AIRDROP_SUPPLY);
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(0);
        });

        it('claiming not started', async function () {
            // end claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await expect(this.airdrop.endClaiming()).to.be.revertedWith("Airdrop::endClaiming: Claiming not started");
        });

        it('ClaimingOver emitted', async function () {
            // allow claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            await expect(this.airdrop.endClaiming()).to.emit(this.airdrop, 'ClaimingOver')
        });

        it('end claiming with some claimed ARC', async function () {
            // whitelist address
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            const arcOut = ONE_TOKEN.mul(100)
            await this.airdrop.whitelistAddresses([altAddr.getAddress()], [arcOut]);

            // enable claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // claim
            await altContract.claim();

            // end claiming
            expect(await this.arc.balanceOf(TREASURY)).to.equal(0);
            await this.airdrop.endClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            expect(await this.arc.balanceOf(TREASURY)).to.equal(AIRDROP_SUPPLY.sub(arcOut));
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(0);
        });

        it('end claiming with all claimed ARC', async function () {
            // whitelist address
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            const arcOut = AIRDROP_SUPPLY;
            await this.airdrop.whitelistAddresses([altAddr.getAddress()], [arcOut]);

            // enable claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // claim
            await altContract.claim();

            // end claiming
            expect(await this.arc.balanceOf(TREASURY)).to.equal(0);
            await this.airdrop.endClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            expect(await this.arc.balanceOf(TREASURY)).to.equal(0);
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(0);
        });

        it('end claiming unauthorized', async function () {
            // allow claiming
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // end claiming
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            await expect(altContract.endClaiming()).to.be.revertedWith(
                'Airdrop::endClaiming: unauthorized');
        });
    });

    //////////////////////////////
    //          claim
    //////////////////////////////
    describe("claim", function () {
        it('successful claim', async function () {
            // Check balance starts at 0
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const arcOut = ethers.BigNumber.from('100');
            await this.airdrop.whitelistAddresses([altAddr.getAddress()], [arcOut]);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(arcOut);

            // Enable claiming
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(arcOut);
        });

        it('event emitted', async function () {
            // Check balance starts at 0
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const arcOut = ethers.BigNumber.from('100');
            await this.airdrop.whitelistAddresses([altAddr.getAddress()], [arcOut]);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(arcOut);

            // Enable claiming
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Claim
            await expect(altContract.claim()).to.emit(altContract, "ArcClaimed").withArgs(altAddr.address, arcOut);

            // Check balance has increased
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(arcOut);
        });

        it('claiming not enabled', async function () {
            // Check balance starts at 0
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const arcOut = ethers.BigNumber.from('100');
            await this.airdrop.whitelistAddresses([altAddr.getAddress()], [arcOut]);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(arcOut);

            // Claim
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: Claiming is not allowed');
        });

        it('ARC already claimed', async function () {
            // Check balance starts at 0
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const arcOut = ethers.BigNumber.from('100');
            await this.airdrop.whitelistAddresses([altAddr.getAddress()], [arcOut]);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(arcOut);

            // Enable claiming
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(arcOut);

            // Try to claim again
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: No ARC to claim');
        });

        it('Nothing to claim', async function () {
            // Check balance starts at 0
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const arcOut = ethers.BigNumber.from('0');

            // Enable claiming
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Attempt claim
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: No ARC to claim');
        });

        it('Nothing to claim but balances present', async function () {
            // Check balance starts at 0
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const arcOut = ethers.BigNumber.from('0');

            // Enable claiming
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Attempt claim
            await expect(altContract.claim()).to.be.revertedWith(
                'Airdrop::claim: No ARC to claim');
        });

        it('Multiple successful claims', async function () {
            [, altAddr, addr3] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            altContract2 = await this.airdrop.connect(addr3);

            // Whitelist address
            const arcOut = ethers.BigNumber.from('100');
            await this.airdrop.whitelistAddresses([altAddr.getAddress()], [arcOut]);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(arcOut);
            await this.airdrop.whitelistAddresses([addr3.getAddress()], [arcOut]);
            expect(await this.airdrop.withdrawAmount(addr3.getAddress())).to.equal(arcOut);

            // Enable claiming
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Check balance starts at 0

            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(0);
            expect(await this.arc.balanceOf(addr3.getAddress())).to.equal(0);

            // Claim
            await altContract.claim();
            await altContract2.claim();


            // Check balance has increased
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(arcOut);
            expect(await this.arc.balanceOf(addr3.getAddress())).to.equal(arcOut);
        });
    });

    //////////////////////////////
    //    whitelistAddresses
    //////////////////////////////
    describe("whitelistAddresses", function () {
        it('Add single address', async function () {
            const arcOut = ethers.BigNumber.from('100');

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            await this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS], [arcOut]);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(arcOut);
        });

        it('Add single address with whitelister', async function () {
            const arcOut = ethers.BigNumber.from('100');

            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);

            await this.airdrop.setWhitelister(altAddr.address);
            expect((await this.airdrop.whitelister())).to.equal(altAddr.address);

            expect(await altContract.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            await altContract.whitelistAddresses([UNPRIVILEGED_ADDRESS], [arcOut]);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(arcOut);
        });

        it('Add multiple addresses', async function () {
            const arcOut = ethers.BigNumber.from('100');
            const arcOut2 = ethers.BigNumber.from('543');

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            expect(await this.airdrop.withdrawAmount(this.admin.address)).to.equal(0);

            await this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS, this.admin.address],
                [arcOut, arcOut2]);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(arcOut);

            expect(await this.airdrop.withdrawAmount(this.admin.address)).to.equal(arcOut2);
        });

        it('Add multiple addresses with whitelister', async function () {
            const arcOut = ethers.BigNumber.from('100');
            const arcOut2 = ethers.BigNumber.from('543');

            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);

            await this.airdrop.setWhitelister(altAddr.address);
            expect((await this.airdrop.whitelister())).to.equal(altAddr.address);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            expect(await this.airdrop.withdrawAmount(this.admin.address)).to.equal(0);

            await altContract.whitelistAddresses([UNPRIVILEGED_ADDRESS, this.admin.address],
                [arcOut, arcOut2]);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(arcOut);

            expect(await this.airdrop.withdrawAmount(this.admin.address)).to.equal(arcOut2);
        });

        it('Exceeds ARC supply cummulatively', async function () {
            const arcOut = AIRDROP_SUPPLY;

            await expect(this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS, this.admin.address],
                [arcOut, arcOut])).to.be.revertedWith(
                    'Airdrop::whitelistAddresses: Exceeds ARC allocation'
                );
        });

        it('Unauthorized call', async function () {
            const arcOut = ethers.BigNumber.from('100');

            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);

            await expect(altContract.whitelistAddresses([UNPRIVILEGED_ADDRESS], [arcOut])).to.be.revertedWith(
                'Airdrop::whitelistAddresses: unauthorized'
            );
        });

        it('Add address twice to override', async function () {
            const arcOut = ethers.BigNumber.from('2000');
            const totalAlloc = await this.airdrop.totalAllocated();

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);

            await this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS], [arcOut]);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(arcOut);
            expect(await this.airdrop.totalAllocated()).to.equal(totalAlloc.add(arcOut));

            await this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS], ['0']);

            expect(await this.airdrop.withdrawAmount(UNPRIVILEGED_ADDRESS)).to.equal(0);
            expect(await this.airdrop.totalAllocated()).to.equal(totalAlloc);

        });

        it('Incorrect addr length', async function () {
            const arcOut = ethers.BigNumber.from('2000');

            await expect(this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS],
                [arcOut, arcOut])).to.be.revertedWith(
                    'Airdrop::whitelistAddresses: incorrect array length'
                );
        });

        it('Incorrect arc length', async function () {
            const arcOut = ethers.BigNumber.from('2000');

            await expect(this.airdrop.whitelistAddresses([UNPRIVILEGED_ADDRESS, this.admin.address],
                [arcOut])).to.be.revertedWith(
                    'Airdrop::whitelistAddresses: incorrect array length'
                );
        });

    });

    //////////////////////////////
    //       End-to-End
    //////////////////////////////
    describe("End-to-End", function () {
        it('Single claim', async function () {
            // Check balance starts at 0
            [, altAddr] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(0);

            // Whitelist address
            const arcOut = ethers.BigNumber.from('100');
            await this.airdrop.whitelistAddresses([altAddr.getAddress()], [arcOut]);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(arcOut);

            // Enable claiming
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Claim
            await altContract.claim();

            // Check balance has increased
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(arcOut);

            // End claiming
            expect(await this.arc.balanceOf(TREASURY)).to.equal(0);
            await this.airdrop.endClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            expect(await this.arc.balanceOf(TREASURY)).to.equal(AIRDROP_SUPPLY.sub(arcOut));
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(0);
        });

        it('Multiple claims', async function () {
            // Check balance starts at 0
            [, altAddr, addr3] = await ethers.getSigners();
            altContract = await this.airdrop.connect(altAddr);
            altContract2 = await this.airdrop.connect(addr3);
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(0);
            expect(await this.arc.balanceOf(addr3.getAddress())).to.equal(0);

            // Whitelist address
            const arcOut = ethers.BigNumber.from('100');
            const arcOut2 = ethers.BigNumber.from('4326543');

            await this.airdrop.whitelistAddresses([altAddr.getAddress(), addr3.getAddress()], [arcOut, arcOut2]);
            expect(await this.airdrop.withdrawAmount(altAddr.getAddress())).to.equal(arcOut);
            expect(await this.airdrop.withdrawAmount(addr3.getAddress())).to.equal(arcOut2);

            // Enable claiming
            await this.arc.transfer(this.airdrop.address, AIRDROP_SUPPLY);
            await this.airdrop.allowClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.true;

            // Claim
            await altContract.claim();
            await altContract2.claim();

            // Check balance has increased
            expect(await this.arc.balanceOf(altAddr.getAddress())).to.equal(arcOut);
            expect(await this.arc.balanceOf(addr3.getAddress())).to.equal(arcOut2);

            // End claiming
            expect(await this.arc.balanceOf(TREASURY)).to.equal(0);
            await this.airdrop.endClaiming();
            expect((await this.airdrop.claimingAllowed())).to.be.false;
            expect(await this.arc.balanceOf(TREASURY)).to.equal(AIRDROP_SUPPLY.sub(arcOut).sub(arcOut2));
            expect(await this.arc.balanceOf(this.airdrop.address)).to.equal(0);
        });
    });
});
