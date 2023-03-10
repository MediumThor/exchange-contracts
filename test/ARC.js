// test/ARC.js
// Load dependencies
const { expect } = require('chai');
const { ethers } = require('hardhat');

const UNPRIVILEGED_ADDRESS = ethers.Wallet.createRandom().address;
const AIRDROP_SUPPLY = ethers.utils.parseUnits("11500000", 18);
const TOTAL_SUPPLY = ethers.utils.parseUnits("230000000", 18);
const ZERO_ADDRESS = ethers.constants.AddressZero;
const UINT96_MAX = ethers.BigNumber.from("2").pow("96").sub("1");

// Start test block
// Only tests for the new features added by shung
describe('ARC', function () {

  before(async function () {
    [this.admin,] = await ethers.getSigners();
    this.ARC = await ethers.getContractFactory("Arc");
  });

  beforeEach(async function () {
    this.arc = await this.ARC.deploy(TOTAL_SUPPLY, AIRDROP_SUPPLY, "ARC", "Arcanum");
    await this.arc.deployed();
  });


  // Test cases


  //////////////////////////////
  //     Constructor
  //////////////////////////////
  describe("Constructor", function () {
    it('arg 1: max supply', async function () {
      expect(await this.arc.maxSupply()).to.equal(TOTAL_SUPPLY);
    });
    it('arg 2: initial supply', async function () {
      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);
    });
    it('arg 3: symbol', async function () {
      expect(await this.arc.symbol()).to.equal("ARC");
    });
    it('arg 4: name', async function () {
      expect(await this.arc.name()).to.equal("Arcanum");
    });
    it('default: hardcapped', async function () {
      expect(await this.arc.hardcapped()).to.be.false;
    });
    it('default: admin', async function () {
      expect(await this.arc.admin()).to.equal(this.admin.address);
    });
    it('default: minter', async function () {
      expect(await this.arc.minter()).to.equal(ZERO_ADDRESS);
    });
    it('default: burnedSupply', async function () {
      expect(await this.arc.burnedSupply()).to.equal(0);
    });
  });


  //////////////////////////////
  //     mint
  //////////////////////////////
  describe("mint", function () {
    it('unauthorized cannot mint', async function () {
      await expect(this.arc.mint(this.admin.address, 1)).to.be.revertedWith("Arc::mint: unauthorized");
    });

    it('authorized can mint', async function () {
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);

      await expect(this.arc.setMinter(this.admin.address)).to.emit(this.arc, "MinterChanged");

      await expect(this.arc.mint(this.admin.address, 1)).to.emit(this.arc, "Transfer");

      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY.add("1"));
      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY.add("1"));
      expect(await this.arc.balanceOf(ZERO_ADDRESS)).to.equal(0);
    });

    it('cannot mint over max supply', async function () {
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);

      await expect(this.arc.setMinter(this.admin.address)).to.emit(this.arc, "MinterChanged");

      await expect(this.arc.mint(this.admin.address, TOTAL_SUPPLY.sub(AIRDROP_SUPPLY).add("1"))).to.be.revertedWith("Arc::_mintTokens: mint result exceeds max supply");

      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.balanceOf(ZERO_ADDRESS)).to.equal(0);
    });

    it('cannot mint to zero address', async function () {
      expect(await this.arc.balanceOf(ZERO_ADDRESS)).to.equal("0");
      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);

      await expect(this.arc.setMinter(this.admin.address)).to.emit(this.arc, "MinterChanged");

      await expect(this.arc.mint(ZERO_ADDRESS, 1)).to.be.revertedWith("Arc::_mintTokens: cannot mint to the zero address");

      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.balanceOf(ZERO_ADDRESS)).to.equal(0);
    });

    it('cannot mint above 96 bits', async function () {
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);

      await expect(this.arc.setMinter(this.admin.address)).to.emit(this.arc, "MinterChanged");

      await expect(this.arc.mint(this.admin.address, UINT96_MAX.sub(AIRDROP_SUPPLY).add("1"))).to.be.revertedWith("Arc::_mintTokens: mint amount overflows");

      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);
    });

  });


  //////////////////////////////
  //     burn
  //////////////////////////////
  describe("burn", function () {
    it('cannot burn above 96 bits', async function () {
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);

      await expect(this.arc.burn(UINT96_MAX.add("1"))).to.be.revertedWith("Arc::burn: amount exceeds 96 bits");

      expect(await this.arc.burnedSupply()).to.equal("0");
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);
    });

    it('cannot burn more than balance', async function () {
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);

      await expect(this.arc.burn(AIRDROP_SUPPLY.add("1"))).to.be.revertedWith("Arc::_burnTokens: burn amount exceeds balance");

      expect(await this.arc.burnedSupply()).to.equal("0");
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);
    });

    it('burns balance', async function () {
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);

      await expect(this.arc.burn(AIRDROP_SUPPLY)).to.emit(this.arc, "Transfer");

      expect(await this.arc.burnedSupply()).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.totalSupply()).to.equal("0");
      expect(await this.arc.balanceOf(this.admin.address)).to.equal("0");
    });

    /* TODO Should also check changes due to _moveDelegates */

  });


  //////////////////////////////
  //     burnFrom
  //////////////////////////////
  describe("burnFrom", function () {
    it('cannot burn above 96 bits', async function () {
      [, altAddr] = await ethers.getSigners();
      altContract = await this.arc.connect(altAddr);

      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);

      await expect(altContract.burnFrom(this.admin.address, UINT96_MAX.add("1"))).to.be.revertedWith("Arc::burnFrom: amount exceeds 96 bits");

      expect(await this.arc.burnedSupply()).to.equal("0");
      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);
    });

    it('cannot burn without allowance', async function () {
      [, altAddr] = await ethers.getSigners();
      altContract = await this.arc.connect(altAddr);

      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);

      await expect(altContract.burnFrom(this.admin.address, "1")).to.be.revertedWith("Arc::burnFrom: burn amount exceeds spender allowance");

      expect(await this.arc.burnedSupply()).to.equal("0");
      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);
    });

    it('can burn with allowance', async function () {
      [, altAddr] = await ethers.getSigners();
      altContract = await this.arc.connect(altAddr);

      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);

      await expect(this.arc.approve(altAddr.address, AIRDROP_SUPPLY)).to.emit(this.arc, "Approval");
      expect(await this.arc.allowance(this.admin.address, altAddr.address)).to.equal(AIRDROP_SUPPLY);

      await expect(altContract.burnFrom(this.admin.address, AIRDROP_SUPPLY)).to.emit(this.arc, "Transfer");

      expect(await this.arc.burnedSupply()).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.balanceOf(this.admin.address)).to.equal("0");
      expect(await this.arc.totalSupply()).to.equal("0");
      expect(await this.arc.allowance(this.admin.address, altAddr.address)).to.equal("0");
    });

    it('cannot burn more than balance', async function () {
      [, altAddr] = await ethers.getSigners();
      altContract = await this.arc.connect(altAddr);

      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);

      await expect(this.arc.approve(altAddr.address, UINT96_MAX)).to.emit(this.arc, "Approval");
      expect(await this.arc.allowance(this.admin.address, altAddr.address)).to.equal(UINT96_MAX);

      await expect(altContract.burnFrom(this.admin.address, AIRDROP_SUPPLY.add("1"))).to.be.revertedWith("Arc::_burnTokens: burn amount exceeds balance");

      expect(await this.arc.burnedSupply()).to.equal("0");
      expect(await this.arc.balanceOf(this.admin.address)).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.totalSupply()).to.equal(AIRDROP_SUPPLY);
      expect(await this.arc.allowance(this.admin.address, altAddr.address)).to.equal(UINT96_MAX);
    });

    /* TODO Should also check changes due to _moveDelegates */

  });


  //////////////////////////////
  //     setMinter
  //////////////////////////////
  describe("setMinter", function () {
    it('admin set minter', async function () {
      expect(await this.arc.minter()).to.equal(ZERO_ADDRESS);

      await expect(this.arc.setMinter(this.admin.address)).to.emit(this.arc, "MinterChanged");

      expect(await this.arc.minter()).to.equal(this.admin.address);
    });

    it('unauthorized cannot set minter', async function () {
      [, altAddr] = await ethers.getSigners();
      altContract = await this.arc.connect(altAddr);

      expect(await this.arc.minter()).to.equal(ZERO_ADDRESS);

      await expect(altContract.setMinter(altAddr.address)).to.be.revertedWith("Arc::setMinter: unauthorized");

      expect(await this.arc.minter()).to.equal(ZERO_ADDRESS);
    });

  });


  //////////////////////////////
  //     setAdmin
  //////////////////////////////
  describe("setAdmin", function () {
    it('admin can set admin', async function () {
      [, altAddr] = await ethers.getSigners();

      expect(await this.arc.admin()).to.equal(this.admin.address);

      await expect(this.arc.setAdmin(altAddr.address)).to.emit(this.arc, "AdminChanged");

      expect(await this.arc.admin()).to.equal(altAddr.address);
    });

    it('unauthorized cannot set admin', async function () {
      [, altAddr] = await ethers.getSigners();
      altContract = await this.arc.connect(altAddr);

      expect(await this.arc.admin()).to.equal(this.admin.address);

      await expect(altContract.setAdmin(altAddr.address)).to.be.revertedWith("Arc::setAdmin: unauthorized");

      expect(await this.arc.admin()).to.equal(this.admin.address);
    });

    it('cannot set zero address admin', async function () {
      expect(await this.arc.admin()).to.equal(this.admin.address);

      await expect(this.arc.setAdmin(ZERO_ADDRESS)).to.be.revertedWith("Arc::setAdmin: cannot make zero address the admin");

      expect(await this.arc.admin()).to.equal(this.admin.address);
    });

  });


  //////////////////////////////
  //     setMaxSupply
  //////////////////////////////
  describe("setMaxSupply", function () {
    it('unauthorized cannot set max supply', async function () {
      [, altAddr] = await ethers.getSigners();
      altContract = await this.arc.connect(altAddr);

      expect(await this.arc.maxSupply()).to.equal(TOTAL_SUPPLY);

      await expect(altContract.setMaxSupply(AIRDROP_SUPPLY)).to.be.revertedWith("Arc::setMaxSupply: unauthorized");

      expect(await this.arc.maxSupply()).to.equal(TOTAL_SUPPLY);
    });

    it('admin can set max supply', async function () {
      expect(await this.arc.maxSupply()).to.equal(TOTAL_SUPPLY);

      await expect(this.arc.setMaxSupply(AIRDROP_SUPPLY)).to.emit(this.arc, "MaxSupplyChanged");

      expect(await this.arc.maxSupply()).to.equal(AIRDROP_SUPPLY);
    });

    it('cannot set max supply less than circulating supply', async function () {
      expect(await this.arc.maxSupply()).to.equal(TOTAL_SUPPLY);

      await expect(this.arc.setMaxSupply(AIRDROP_SUPPLY.sub("1"))).to.be.revertedWith("Arc::setMaxSupply: circulating supply exceeds new max supply");

      expect(await this.arc.maxSupply()).to.equal(TOTAL_SUPPLY);
    });

    it('cannot set max supply more than 96 bits', async function () {
      expect(await this.arc.maxSupply()).to.equal(TOTAL_SUPPLY);

      await expect(this.arc.setMaxSupply(UINT96_MAX.add("1"))).to.be.revertedWith("Arc::setMaxSupply: new max supply exceeds 96 bits");

      expect(await this.arc.maxSupply()).to.equal(TOTAL_SUPPLY);
    });

    it('cannot set max supply when hardcap is enabled', async function () {
      expect(await this.arc.maxSupply()).to.equal(TOTAL_SUPPLY);

      await expect(this.arc.disableSetMaxSupply()).to.emit(this.arc, "HardcapEnabled");
      await expect(this.arc.setMaxSupply(AIRDROP_SUPPLY)).to.be.revertedWith("Arc::setMaxSupply: function was disabled");

      expect(await this.arc.maxSupply()).to.equal(TOTAL_SUPPLY);
    });

  });


  //////////////////////////////
  //     disableSetMaxSupply
  //////////////////////////////
  describe("disableSetMaxSupply", function () {
    it('unauthorized cannot disable setMaxSupply', async function () {
      [, altAddr] = await ethers.getSigners();
      altContract = await this.arc.connect(altAddr);

      expect(await this.arc.hardcapped()).to.equal(false);

      await expect(altContract.disableSetMaxSupply()).to.be.revertedWith("Arc::disableSetMaxSupply: unauthorized");
      await expect(this.arc.setMaxSupply(AIRDROP_SUPPLY)).to.emit(this.arc, "MaxSupplyChanged");

      expect(await this.arc.hardcapped()).to.equal(false);
    });

    it('admin can disable setMaxSupply', async function () {
      expect(await this.arc.hardcapped()).to.equal(false);

      await expect(this.arc.disableSetMaxSupply()).to.emit(this.arc, "HardcapEnabled");
      await expect(this.arc.setMaxSupply(AIRDROP_SUPPLY)).to.be.revertedWith("Arc::setMaxSupply: function was disabled");

      expect(await this.arc.hardcapped()).to.equal(true);
    });

  });


});
