// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IArcanaChef {
    function rewardsToken() external view returns (address);

    function addReward(uint256 amount) external;

    function hasRole(bytes32 role, address account)
        external
        view
        returns (bool);
}

/**
 * @author shung for Arcanum
 * @notice
 *
 * Funder -> RewardFundingForwarder -> ArcanaChef
 *               OR
 * Funder -> RewardFundingForwarder -> ArcanumStakingPositions
 *
 * Funder is any contract that was written for Synthetix' StakingRewards, or for MiniChef.
 * RewardFundingForwarder provides compatibility for these old funding contracts.
 */
contract RewardFundingForwarder {
    IArcanaChef public immutable arcanaChef;
    address public immutable rewardsToken;
    bytes32 private constant FUNDER_ROLE = keccak256("FUNDER_ROLE");

    modifier onlyFunder() {
        require(arcanaChef.hasRole(FUNDER_ROLE, msg.sender), "unauthorized");
        _;
    }

    constructor(address newArcanaChef) {
        require(newArcanaChef.code.length != 0, "empty contract");
        address newRewardsToken = IArcanaChef(newArcanaChef).rewardsToken();
        IERC20(newRewardsToken).approve(newArcanaChef, type(uint256).max);
        arcanaChef = IArcanaChef(newArcanaChef);
        rewardsToken = newRewardsToken;
    }

    function notifyRewardAmount(uint256 amount) external onlyFunder {
        arcanaChef.addReward(amount);
    }

    function fundRewards(uint256 amount, uint256) external {
        addReward(amount);
    }

    function addReward(uint256 amount) public onlyFunder {
        IERC20(rewardsToken).transferFrom(msg.sender, address(this), amount);
        arcanaChef.addReward(amount);
    }
}
