exports.WRAPPED_NATIVE_TOKEN = "0xd00ae08403B9bbb9124bB305C09058E32C39A48c";
//exports.WAVAX_ADDRESS = "0xd00ae08403B9bbb9124bB305C09058E32C39A48c";
exports.ARC_SYMBOL = "ARC";
exports.ARC_NAME = "Arcanum";
exports.ARC_ADDRESS = "0x900D426f34C495a27425Cc9F86E04Fd4C1131051";
exports.TOTAL_SUPPLY = 230000000; // two-hundred-and-thirty million.
exports.AIRDROP_AMOUNT = 11500000; // 11.5M or 5% of max supply
exports.TIMELOCK_DELAY = 3 * 24 * 60 * 60; // 3 days
exports.USE_GNOSIS_SAFE = false;
exports.START_VESTING = true;
exports.LINEAR_VESTING = true;
exports.VESTING_COUNT = 90; // 3 months == 90 days.
exports.ARC_STAKING_ALLOCATION = 500, // 5x weight in minichef
  exports.WETH_ARC_FARM_ALLOCATION = 3000, // 30x weight
  exports.MULTISIG = {
    owners: [
      "0x72C397908Cb93d1B569BBB0Ff8d3D26B7b21d730", // Trollip
      "0xDA315a838E918026E51A864c43766f5AE86be8c6"  // Shung
    ],
    threshold: 2
  };
exports.INITIAL_FARMS = [
  {
    tokenA: "0x18D693EE3336AAF8Dffd1f579ECEd1Ea0E6855ba", // DUM
    tokenB: ARC,
    weight: 2000
  },
  {
    tokenA: "0x18D693EE3336AAF8Dffd1f579ECEd1Ea0E6855ba", // ARC
    tokenB: WETH,
    weight: 1000
  }
];
exports.VESTER_ALLOCATIONS = [
  {
    recipient: "treasury", // community treasury
    allocation: 2105, // 20%
  },
  {
    recipient: "multisig", // fARC team
    allocation: 1579, // 10% team + 5% vc investor
  },
  {
    recipient: "foundation", // ARC Foundation multisig
    allocation: 263, // 2.5% advisory
  },
  {
    recipient: "chef", // MiniChef
    allocation: 6053, // 57.5% LPs & ARC Staking
    isMiniChef: true
  }
];

exports.REVENUE_DISTRIBUTION = [
  {
    recipient: "foundation", // Arcanum Foundation
    allocation: 2000,        // 20%
  },
  {
    recipient: "multisig", // New team
    allocation: 8000,      // 80%
  }
]