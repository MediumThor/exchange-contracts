const { smock } = require('@defi-wonderland/smock');
const { ethers, network } = require('hardhat');
const chai = require('chai');
chai.use(smock.matchers);
const { expect } = chai;

describe('FeeCollector', function () {

    const TREASURY_ADDRESS = '0x66c048d27aFB5EE59E4C07101A483654246A4eda';
    const GOVERNOR_ADDRESS = '0xEB5c91bE6Dbfd30cf616127C2EA823C64e4b1ff8';

    const HARVEST_ROLE = keccak256('HARVEST_ROLE');
    const PAUSE_ROLE = keccak256('PAUSE_ROLE');
    const RECOVERY_ROLE = keccak256('RECOVERY_ROLE');
    const GOVERNOR_ROLE = keccak256('GOVERNOR_ROLE');

    let OWNER, addr1, addr2, addr3, governorSigner;
    let FeeCollector, MiniChefV2, StakingRewards, ArcanumFactory, ArcanumPair, _Token;
    let feeCollector, arcanumFactory, stakingRewards, _miniChefV2;
    let wavax, arc, tokenA, tokenB;

    before(async function () {
        [OWNER, addr1, addr2, addr3] = await ethers.getSigners();

        await network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [GOVERNOR_ADDRESS]
        });
        governorSigner = await ethers.provider.getSigner(GOVERNOR_ADDRESS);

        // Ensure governor has gas to send txs
        await OWNER.sendTransaction({
            to: GOVERNOR_ADDRESS,
            value: ethers.utils.parseEther('10'),
        });

        FeeCollector = await ethers.getContractFactory('FeeCollector');
        MiniChefV2 = await ethers.getContractFactory('MiniChefV2');
        StakingRewards = await ethers.getContractFactory('StakingRewards');
        ArcanumFactory = await ethers.getContractFactory('ArcanumFactory');
        ArcanumPair = await ethers.getContractFactory('ArcanumPair');

        _Token = await smock.mock('Arc');
    });

    beforeEach(async function () {
        _miniChefV2 = await smock.fake(MiniChefV2);

        wavax = await _Token.deploy(
            ethers.utils.parseEther('100000000'), // _maxSupply
            ethers.utils.parseEther('100000000'), // initialSupply
            'WAVAX', // _symbol
            'Wrapped AVAX', // _name
        );
        await wavax.deployed();

        arc = await _Token.deploy(
            ethers.utils.parseEther('100000000'), // _maxSupply
            ethers.utils.parseEther('100000000'), // initialSupply
            'ARC', // _symbol
            'Arcanum Token', // _name
        );
        await arc.deployed();

        tokenA = await _Token.deploy(
            ethers.utils.parseEther('100000000'), // _maxSupply
            ethers.utils.parseEther('100000000'), // initialSupply
            'TOKA', // _symbol
            'Token A', // _name
        );
        await tokenA.deployed();

        tokenB = await _Token.deploy(
            ethers.utils.parseEther('100000000'), // _maxSupply
            ethers.utils.parseEther('100000000'), // initialSupply
            'TOKB', // _symbol
            'Token B', // _name
        );
        await tokenB.deployed();

        stakingRewards = await StakingRewards.deploy(
            arc.address,
            arc.address,
        );
        await stakingRewards.deployed();

        arcanumFactory = await ArcanumFactory.deploy(OWNER.address);
        await arcanumFactory.deployed();

        feeCollector = await FeeCollector.deploy(
            wavax.address,
            arcanumFactory.address,
            '0x40231f6b438bce0797c9ada29b718a87ea0a5cea3fe9a771abdd76bd41a3e545', // init pair hash
            stakingRewards.address,
            _miniChefV2.address,
            0, // chef pid for dummy ARL
            TREASURY_ADDRESS, // ???treasury??? fees
            GOVERNOR_ADDRESS, // timelock
            OWNER.address, // admin
        );
        await feeCollector.deployed();

        // Enable fee switch
        await arcanumFactory.setFeeTo(feeCollector.address);

        // FeeCollector needs ownership of StakingRewards to fund the program
        await stakingRewards.transferOwnership(feeCollector.address);
    });

    describe('Permissions', async function () {
        let userWithRole, userWithoutRole;

        describe('HARVEST_ROLE', async function () {
            beforeEach(async function () {
                userWithRole = addr1;
                await feeCollector.connect(OWNER).grantRole(HARVEST_ROLE, userWithRole.address);
                userWithoutRole = addr2;
                await feeCollector.connect(OWNER).revokeRole(HARVEST_ROLE, userWithoutRole.address);
            });
            itPassesBasicRoleTests(HARVEST_ROLE);
        });
        describe('PAUSE_ROLE', async function () {
            beforeEach(async function () {
                userWithRole = addr1;
                await feeCollector.connect(OWNER).grantRole(PAUSE_ROLE, userWithRole.address);
                userWithoutRole = addr2;
                await feeCollector.connect(OWNER).revokeRole(PAUSE_ROLE, userWithoutRole.address);
            });
            itPassesBasicRoleTests(PAUSE_ROLE);
        });
        describe('RECOVERY_ROLE', async function () {
            const randomAddress = '0x1000000000000000000000000000000000000001';
            beforeEach(async function () {
                userWithRole = addr1;
                await feeCollector.connect(OWNER).grantRole(RECOVERY_ROLE, userWithRole.address);
                userWithoutRole = addr2;
                await feeCollector.connect(OWNER).revokeRole(RECOVERY_ROLE, userWithoutRole.address);
            });
            it('Is granted by default to admin', async function () {
                expect(await feeCollector.hasRole(RECOVERY_ROLE, OWNER.address)).to.be.true;
            });
            it('Admin (without role) cannot grant rule', async function () {
                await feeCollector.connect(userWithRole).revokeRole(RECOVERY_ROLE, OWNER.address);
                await expect(feeCollector.connect(OWNER).grantRole(
                    RECOVERY_ROLE,
                    userWithoutRole.address,
                )).to.be.reverted;
                expect(await feeCollector.hasRole(RECOVERY_ROLE, userWithoutRole.address)).to.be.false;
            });
            it('User with role can grant role', async function () {
                await expect(feeCollector.connect(userWithRole).grantRole(
                    RECOVERY_ROLE,
                    userWithoutRole.address,
                )).not.to.be.reverted;
                expect(await feeCollector.hasRole(RECOVERY_ROLE, userWithoutRole.address)).to.be.true;
            });
            it('User with role can whitelist token', async function () {
                await expect(feeCollector.connect(userWithRole).setRecoverable(randomAddress, true)).not.to.be.reverted;
                expect(await feeCollector.isRecoverable(randomAddress)).to.be.true;
            });
            it('User with role can de-whitelist token', async function () {
                await expect(feeCollector.connect(userWithRole).setRecoverable(randomAddress, true)).not.to.be.reverted;
                await expect(feeCollector.connect(userWithRole).setRecoverable(randomAddress, false)).not.to.be.reverted;
                expect(await feeCollector.isRecoverable(randomAddress)).to.be.false;
            });
            it('User without role cannot whitelist token', async function () {
                await expect(feeCollector.connect(userWithoutRole).setRecoverable(randomAddress, true)).to.be.reverted;
                expect(await feeCollector.isRecoverable(randomAddress)).to.be.false;
            });
            it('User without role cannot de-whitelist token', async function () {
                await expect(feeCollector.connect(userWithRole).setRecoverable(randomAddress, true)).not.to.be.reverted;
                await expect(feeCollector.connect(userWithoutRole).setRecoverable(randomAddress, false)).to.be.reverted;
                expect(await feeCollector.isRecoverable(randomAddress)).to.be.true;
            });
        });
        describe('GOVERNOR_ROLE', async function () {
            beforeEach(async function () {
                userWithRole = addr1;
                await feeCollector.connect(governorSigner).grantRole(GOVERNOR_ROLE, userWithRole.address);
                userWithoutRole = addr2;
                await feeCollector.connect(governorSigner).revokeRole(GOVERNOR_ROLE, userWithoutRole.address);
            });
            it('Is not granted by default to admin', async function () {
                expect(await feeCollector.hasRole(GOVERNOR_ROLE, OWNER.address)).to.be.false;
            });
            it('Admin (without role) cannot grant rule', async function () {
                await feeCollector.connect(userWithRole).revokeRole(GOVERNOR_ROLE, OWNER.address);
                await expect(feeCollector.connect(OWNER).grantRole(
                    GOVERNOR_ROLE,
                    userWithoutRole.address,
                )).to.be.reverted;
                expect(await feeCollector.hasRole(GOVERNOR_ROLE, userWithoutRole.address)).to.be.false;
            });
            it('User with role can grant role', async function () {
                await expect(feeCollector.connect(userWithRole).grantRole(
                    GOVERNOR_ROLE,
                    userWithoutRole.address,
                )).not.to.be.reverted;
                expect(await feeCollector.hasRole(GOVERNOR_ROLE, userWithoutRole.address)).to.be.true;
            });
            it('User with role can set treasury fee', async function () {
                await expect(feeCollector.connect(userWithRole).setTreasuryFee(
                    '20', // 0.2% in bips
                )).not.to.be.reverted;
                expect(await feeCollector.treasuryFee()).to.equal('20');
            });
            it('User without role cannot set treasury fee', async function () {
                await expect(feeCollector.connect(userWithoutRole).setTreasuryFee(
                    '20', // 0.2% in bips
                )).to.be.reverted;
                expect(await feeCollector.treasuryFee()).not.to.equal('20');
            });
        });

        function itPassesBasicRoleTests(role) {
            it('Is granted by default to admin', async function () {
                expect(await feeCollector.hasRole(role, OWNER.address)).to.be.true;
            });
            it('Admin can grant rule', async function () {
                const userGrantee = userWithoutRole;
                await expect(feeCollector.connect(OWNER).grantRole(
                    role,
                    userGrantee.address,
                )).not.to.be.reverted;
                expect(await feeCollector.hasRole(role, userGrantee.address)).to.be.true;
            });
            it('User with role cannot grant role', async function () {
                const userGrantee = userWithoutRole;
                await expect(feeCollector.connect(userWithRole).grantRole(
                    role,
                    userGrantee.address,
                )).to.be.reverted;
                expect(await feeCollector.hasRole(role, userGrantee.address)).to.be.false;
            });
        }
    });

    describe('Treasury Fee', async function () {
        let userWithGovernorRole, userWithoutGovernorRole;
        const FEE_DENOMINATOR = 10000;
        const TREASURY_INCENTIVE = 1500;

        beforeEach(async function () {
            userWithGovernorRole = addr1;
            await feeCollector.connect(governorSigner).grantRole(GOVERNOR_ROLE, userWithGovernorRole.address);
            userWithoutGovernorRole = addr2;
            await feeCollector.connect(governorSigner).revokeRole(GOVERNOR_ROLE, userWithoutGovernorRole.address);
        });
        it('User with role can set treasury fee', async function () {
            const newTreasuryFee = TREASURY_INCENTIVE + 1;
            await expect(feeCollector.connect(userWithGovernorRole).setTreasuryFee(
                newTreasuryFee,
            )).not.to.be.reverted;
            expect(await feeCollector.treasuryFee()).to.equal(newTreasuryFee);
        });
        it('User without role cannot set treasury fee', async function () {
            const newTreasuryFee = TREASURY_INCENTIVE + 1;
            await expect(feeCollector.connect(userWithoutGovernorRole).setTreasuryFee(
                newTreasuryFee,
            )).to.be.reverted;
            expect(await feeCollector.treasuryFee()).to.equal(TREASURY_INCENTIVE);
        });
        it('Treasury fee cannot exceed total allocation', async function () {
            await expect(feeCollector.connect(userWithGovernorRole).setTreasuryFee(
                FEE_DENOMINATOR,
            )).to.be.revertedWith('Total fees must <= 100');
            expect(await feeCollector.treasuryFee()).to.equal(TREASURY_INCENTIVE);
        });
    });

    describe('Harvest Incentive', async function () {
        const MAX_HARVEST_INCENTIVE = 200;
        const HARVEST_INCENTIVE = 10;

        it('Admin can set harvest incentive', async function () {
            const newHarvestIncentive = HARVEST_INCENTIVE + 1;
            await expect(feeCollector.connect(OWNER).setHarvestIncentive(
                newHarvestIncentive,
            )).not.to.be.reverted;
            expect(await feeCollector.harvestIncentive()).to.equal(newHarvestIncentive);
        });
        it('Non-admin cannot set harvest incentive', async function () {
            const newTreasuryFee = HARVEST_INCENTIVE + 1;
            await expect(feeCollector.connect(addr1).setHarvestIncentive(
                newTreasuryFee,
            )).to.be.reverted;
            expect(await feeCollector.harvestIncentive()).to.equal(HARVEST_INCENTIVE);
        });
        it('Harvest incentive cannot exceed max', async function () {
            await expect(feeCollector.connect(OWNER).setHarvestIncentive(
                MAX_HARVEST_INCENTIVE + 1,
            )).to.be.revertedWith('Incentive too large');
            expect(await feeCollector.harvestIncentive()).to.equal(HARVEST_INCENTIVE);
        });
    });

    describe('Pausing', async function () {
        let userWithPauseRole, userWithoutPauseRole;
        let userWithHarvestRole;

        beforeEach(async function () {
            userWithPauseRole = addr1;
            await feeCollector.connect(OWNER).grantRole(PAUSE_ROLE, userWithPauseRole.address);
            userWithoutPauseRole = addr2;
            await feeCollector.connect(OWNER).revokeRole(PAUSE_ROLE, userWithoutPauseRole.address);
            userWithHarvestRole = addr3;
            await feeCollector.connect(OWNER).grantRole(HARVEST_ROLE, userWithHarvestRole.address);
        });
        it('Initializes as unpaused', async function () {
            expect(await feeCollector.paused()).to.be.false;
        });
        it('Cannot call harvest() when paused', async function () {
            await feeCollector.connect(userWithPauseRole).pause();
            await expect(feeCollector.connect(userWithHarvestRole).harvest(
                [],
                false,
                0,
            )).to.be.revertedWith('Pausable: paused');
        });
        it('Can call harvest() when unpaused', async function () {
            await expect(feeCollector.connect(userWithHarvestRole).harvest(
                [],
                false,
                0,
            )).not.to.be.reverted;
        });
        it('Cannot call recoverLP() when paused', async function () {
            await feeCollector.connect(userWithPauseRole).pause();
            await expect(feeCollector.connect(OWNER).recoverLP(
                [],
            )).to.be.revertedWith('Pausable: paused');
        });
        it('Can call recoverLP() when unpaused', async function () {
            await expect(feeCollector.connect(OWNER).recoverLP(
                [],
            )).not.to.be.reverted;
        });
    });

    describe('Harvesting', async function () {
        let userWithHarvestRole, userWithoutHarvestRole;
        let pair_WAVAX_ARC, pair_WAVAX_A, pair_WAVAX_B, pair_A_B;

        beforeEach(async function () {
            userWithHarvestRole = addr1;
            await feeCollector.connect(OWNER).grantRole(HARVEST_ROLE, userWithHarvestRole.address);
            userWithoutHarvestRole = addr2;
            await feeCollector.connect(OWNER).revokeRole(HARVEST_ROLE, userWithoutHarvestRole.address);

            pair_WAVAX_ARC = await createPair(wavax, arc);
            await addLiquidity(
                pair_WAVAX_ARC,
                wavax,
                ethers.utils.parseEther('100000'),
                arc,
                ethers.utils.parseEther('100000'),
                OWNER,
            );
            await transferLiquidityToFeeCollector(pair_WAVAX_ARC, OWNER);

            pair_WAVAX_A = await createPair(wavax, tokenA);
            await addLiquidity(
                pair_WAVAX_A,
                wavax,
                ethers.utils.parseEther('100000'),
                tokenA,
                ethers.utils.parseEther('100000'),
                OWNER,
            );
            await transferLiquidityToFeeCollector(pair_WAVAX_A, OWNER);

            pair_WAVAX_B = await createPair(wavax, tokenB);
            await addLiquidity(
                pair_WAVAX_B,
                wavax,
                ethers.utils.parseEther('100000'),
                tokenB,
                ethers.utils.parseEther('100000'),
                OWNER,
            );
            await transferLiquidityToFeeCollector(pair_WAVAX_B, OWNER);

            pair_A_B = await createPair(tokenA, tokenB);
            await addLiquidity(
                pair_A_B,
                tokenA,
                ethers.utils.parseEther('100000'),
                tokenB,
                ethers.utils.parseEther('100000'),
                OWNER,
            );
            await transferLiquidityToFeeCollector(pair_A_B, OWNER);

            // Reset for accurate call counts
            arc.transfer.reset();
        });
        it('User with HARVEST_ROLE can harvest', async function () {
            await expect(feeCollector.connect(userWithHarvestRole).harvest(
                [],
                false,
                0,
            )).not.to.be.reverted;
            await expect(arc.transfer).to.have.callCount(0);
        });
        it('User can harvest pair involving WAVAX and ARC', async function () {
            await expect(feeCollector.connect(userWithHarvestRole).harvest(
                [pair_WAVAX_ARC.address],
                false,
                0,
            )).not.to.be.reverted;
            // arc.transfer 0: burn
            // arc.transfer 1: wavax-arc pair sending ARC back to FeeCollector
            expect(arc.transfer.getCall(2).args[0]).to.equal(stakingRewards.address);
            expect(arc.transfer.getCall(2).args[1]).to.be.gt(0);
            expect(arc.transfer.getCall(3).args[0]).to.equal(TREASURY_ADDRESS);
            expect(arc.transfer.getCall(3).args[1]).to.be.gt(0);
            expect(arc.transfer.getCall(4).args[0]).to.equal(userWithHarvestRole.address);
            expect(arc.transfer.getCall(4).args[1]).to.be.gt(0);
        });
        it('User can harvest pair involving WAVAX and A', async function () {
            await expect(feeCollector.connect(userWithHarvestRole).harvest(
                [pair_WAVAX_A.address],
                false,
                0,
            )).not.to.be.reverted;
            // arc.transfer 0: wavax-arc pair sending ARC back to FeeCollector
            // arc.transfer 1: wavax-arc pair sending ARC back to FeeCollector
            expect(arc.transfer.getCall(2).args[0]).to.equal(stakingRewards.address);
            expect(arc.transfer.getCall(2).args[1]).to.be.gt(0);
            expect(arc.transfer.getCall(3).args[0]).to.equal(TREASURY_ADDRESS);
            expect(arc.transfer.getCall(3).args[1]).to.be.gt(0);
            expect(arc.transfer.getCall(4).args[0]).to.equal(userWithHarvestRole.address);
            expect(arc.transfer.getCall(4).args[1]).to.be.gt(0);
        });
        it('User can harvest pair involving A and B', async function () {
            await expect(feeCollector.connect(userWithHarvestRole).harvest(
                [pair_A_B.address],
                false,
                0,
            )).not.to.be.reverted;
            // arc.transfer 0: wavax-arc pair sending ARC back to FeeCollector
            // arc.transfer 1: wavax-arc pair sending ARC back to FeeCollector
            expect(arc.transfer.getCall(2).args[0]).to.equal(stakingRewards.address);
            expect(arc.transfer.getCall(2).args[1]).to.be.gt(0);
            expect(arc.transfer.getCall(3).args[0]).to.equal(TREASURY_ADDRESS);
            expect(arc.transfer.getCall(3).args[1]).to.be.gt(0);
            expect(arc.transfer.getCall(4).args[0]).to.equal(userWithHarvestRole.address);
            expect(arc.transfer.getCall(4).args[1]).to.be.gt(0);
        });
        it('Slippage tolerance reverts harvest', async function () {
            const mockFinalBalance = 100;
            arc.balanceOf.whenCalledWith(feeCollector.address).returns(mockFinalBalance);
            await expect(feeCollector.connect(userWithHarvestRole).harvest(
                [pair_WAVAX_ARC.address],
                false,
                mockFinalBalance + 1,
            )).to.be.revertedWith('High Slippage');
            await expect(arc.transfer).to.have.callCount(2); // burn, wavax-arc swap
        });
        it('Call incentive is calculated correctly', async function () {
            const mockFinalBalance = ethers.utils.parseEther('10000');
            arc.balanceOf.whenCalledWith(feeCollector.address).returns(mockFinalBalance);
            await expect(feeCollector.connect(userWithHarvestRole).harvest(
                [pair_WAVAX_ARC.address],
                false,
                0,
            )).not.to.be.reverted;
            await expect(arc.transfer).to.have.been.calledWith(userWithHarvestRole.address, ethers.utils.parseEther('10'));
        });
        it('Treasury fee is calculated correctly', async function () {
            const mockFinalBalance = ethers.utils.parseEther('10000');
            arc.balanceOf.whenCalledWith(feeCollector.address).returns(mockFinalBalance);
            await expect(feeCollector.connect(userWithHarvestRole).harvest(
                [pair_WAVAX_ARC.address],
                false,
                0,
            )).not.to.be.reverted;
            await expect(arc.transfer).to.have.been.calledWith(TREASURY_ADDRESS, ethers.utils.parseEther('1500'));
        });
        it('Staking rewards amount is calculated correctly', async function () {
            const mockFinalBalance = ethers.utils.parseEther('10000');
            arc.balanceOf.whenCalledWith(feeCollector.address).returns(mockFinalBalance);
            await expect(feeCollector.connect(userWithHarvestRole).harvest(
                [pair_WAVAX_ARC.address],
                false,
                0,
            )).not.to.be.reverted;
            await expect(arc.transfer).to.have.been.calledWith(stakingRewards.address, ethers.utils.parseEther('8490'));
        });
    });

    describe('Recovering', async function () {
        let userWithRecoveryRole, userWithoutRecoveryRole;
        let _lp0;
        const bal = ethers.utils.parseEther('10');

        beforeEach(async function () {
            userWithRecoveryRole = addr1;
            await feeCollector.connect(OWNER).grantRole(RECOVERY_ROLE, userWithRecoveryRole.address);
            userWithoutRecoveryRole = addr2;
            await feeCollector.connect(OWNER).revokeRole(RECOVERY_ROLE, userWithoutRecoveryRole.address);

            _lp0 = await smock.fake(ArcanumPair);

            _lp0.transfer.whenCalledWith(TREASURY_ADDRESS, bal).returns(true);
            _lp0.balanceOf.whenCalledWith(feeCollector.address).returns(bal);
        });
        it('Admin can recover whitelisted token', async function () {
            await feeCollector.connect(userWithRecoveryRole).setRecoverable(_lp0.address, true);
            await expect(feeCollector.connect(OWNER).recoverLP(
                [_lp0.address],
            )).not.to.be.reverted;
            expect(_lp0.balanceOf).to.have.been.calledOnceWith(feeCollector.address);
            expect(_lp0.transfer).to.have.been.calledOnceWith(TREASURY_ADDRESS, bal);
        });
        it('Admin cannot recover non-whitelisted token', async function () {
            await feeCollector.connect(userWithRecoveryRole).setRecoverable(_lp0.address, false);
            await expect(feeCollector.connect(OWNER).recoverLP(
                [_lp0.address],
            )).to.be.revertedWith('Cannot recover');
            expect(_lp0.transfer).not.to.have.been.called;
        });
    });


    // Helpers
    async function createPair(tokenA, tokenB) {
        await arcanumFactory.createPair(tokenA.address, tokenB.address);
        const address = await arcanumFactory.getPair(tokenA.address, tokenB.address);
        return ArcanumPair.attach(address);
    }
    async function addLiquidity(pair, tokenA, amountA, tokenB, amountB, user) {
        await tokenA.connect(user).transfer(pair.address, amountA);
        await tokenB.connect(user).transfer(pair.address, amountB);
        await pair.connect(user).mint(user.address);
    }
    async function transferLiquidityToFeeCollector(pair, user) {
        const bal = await pair.balanceOf(user.address);
        await pair.connect(user).transfer(feeCollector.address, bal);
    }
});

function keccak256(value) {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(value));
}
