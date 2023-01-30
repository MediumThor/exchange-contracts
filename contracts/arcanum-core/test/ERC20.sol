pragma solidity =0.5.16;

import '../ArcanumERC20.sol';

contract ERC20 is ArcanumERC20 {
    constructor(uint _totalSupply) public {
        _mint(msg.sender, _totalSupply);
    }
}
