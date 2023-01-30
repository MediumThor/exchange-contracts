pragma solidity ^0.7.6;

import "openzeppelin-contracts-legacy/access/Ownable.sol";
import "openzeppelin-contracts-legacy/token/ERC20/SafeERC20.sol";
import "openzeppelin-contracts-legacy/token/ERC20/IERC20.sol";

/**
 * Custodian of community's ARC. Deploy this contract, then change the owner to be a
 * governance protocol. Send community treasury funds to the deployed contract, then
 * spend them through governance proposals.
 */
contract CommunityTreasury is Ownable {
    using SafeERC20 for IERC20;

    // Token to custody
    IERC20 public arc;

    constructor(address arc_) {
        arc = IERC20(arc_);
    }

    /**
     * Transfer ARC to the destination. Can only be called by the contract owner.
     */
    function transfer(address dest, uint256 amount) external onlyOwner {
        arc.safeTransfer(dest, amount);
    }

    /**
     * Return the ARC balance of this contract.
     */
    function balance() external view returns (uint256) {
        return arc.balanceOf(address(this));
    }
}
