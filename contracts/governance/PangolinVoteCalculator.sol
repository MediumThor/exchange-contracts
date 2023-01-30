pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IMiniChefV2 {
    struct UserInfo {
        uint256 amount;
        int256 rewardDebt;
    }

    function lpTokens() external view returns (address[] memory);

    function userInfo(uint256 pid, address user)
        external
        view
        returns (IMiniChefV2.UserInfo memory);
}

interface IArcanumPair {
    function totalSupply() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);
}

interface IArcanumERC20 {
    function balanceOf(address owner) external view returns (uint256);

    function getCurrentVotes(address account) external view returns (uint256);

    function delegates(address account) external view returns (address);
}

interface IStakingRewards {
    function stakingToken() external view returns (address);

    function balanceOf(address owner) external view returns (uint256);
}

// SPDX-License-Identifier: MIT
contract ArcanumVoteCalculator is Ownable {
    IArcanumERC20 arc;
    IMiniChefV2 miniChef;

    constructor(address _arc, address _miniChef) {
        arc = IArcanumERC20(_arc);
        miniChef = IMiniChefV2(_miniChef);
    }

    function getVotesFromFarming(address voter, uint256[] calldata pids)
        external
        view
        returns (uint256 votes)
    {
        address[] memory lpTokens = miniChef.lpTokens();

        for (uint256 i; i < pids.length; i++) {
            // Skip invalid pids
            if (pids[i] >= lpTokens.length) continue;

            address arlAddress = lpTokens[pids[i]];
            IArcanumPair pair = IArcanumPair(arlAddress);

            uint256 pair_total_ARC = arc.balanceOf(arlAddress);
            uint256 pair_total_ARL = pair.totalSupply(); // Could initially be 0 in rare pre-mint situations

            uint256 ARL_hodling = pair.balanceOf(voter);
            uint256 ARL_staking = miniChef.userInfo(pids[i], voter).amount;

            votes +=
                ((ARL_hodling + ARL_staking) * pair_total_ARC) /
                pair_total_ARL;
        }
    }

    function getVotesFromStaking(address voter, address[] calldata stakes)
        external
        view
        returns (uint256 votes)
    {
        for (uint256 i; i < stakes.length; i++) {
            IStakingRewards staking = IStakingRewards(stakes[i]);

            // Safety check to ensure staking token is ARC
            if (staking.stakingToken() == address(arc)) {
                votes += staking.balanceOf(voter);
            }
        }
    }

    function getVotesFromWallets(address voter)
        external
        view
        returns (uint256 votes)
    {
        // Votes delegated to the voter
        votes += arc.getCurrentVotes(voter);

        // Voter has never delegated
        if (arc.delegates(voter) == address(0)) {
            votes += arc.balanceOf(voter);
        }
    }
}
