// SPDX-License-Identifier: GPLv3
pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IArcanaChef {
    function claim(uint256 poolId) external returns (uint256 reward);

    function rewardsToken() external view returns (address);

    function addReward(uint256 amount) external;

    function hasRole(bytes32 role, address account)
        external
        view
        returns (bool);
}

/** @author shung for Arcanum */
contract EmissionDiversionFromArcanaChefToArcanumStakingPositions {
    IArcanaChef public immutable arcanaChef;
    IArcanaChef public immutable arcanumStakingPositions;
    address public immutable rewardsToken;
    bytes32 private constant FUNDER_ROLE = keccak256("FUNDER_ROLE");

    modifier onlyFunder() {
        require(
            arcanumStakingPositions.hasRole(FUNDER_ROLE, msg.sender),
            "unauthorized"
        );
        _;
    }

    constructor(address newArcanaChef, address newStakingPositions) {
        require(newArcanaChef.code.length != 0, "empty contract");
        address newRewardsToken = IArcanaChef(newArcanaChef).rewardsToken();
        require(
            newRewardsToken == IArcanaChef(newStakingPositions).rewardsToken(),
            "invalid addresses"
        );
        IERC20(newRewardsToken).approve(newStakingPositions, type(uint256).max);
        arcanaChef = IArcanaChef(newArcanaChef);
        arcanumStakingPositions = IArcanaChef(newStakingPositions);
        rewardsToken = newRewardsToken;
    }

    function claimAndAddReward(uint256 poolId) external onlyFunder {
        uint256 amount = arcanaChef.claim(poolId);
        arcanumStakingPositions.addReward(amount);
    }

    function notifyRewardAmount(uint256 amount) external onlyFunder {
        arcanumStakingPositions.addReward(amount);
    }
}
