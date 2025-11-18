// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TRIV Token (mintable ERC20)
/// @notice Lightweight ERC20 token used for staking and reward distribution in local/dev environments
contract TRIVToken is ERC20, Ownable {
    constructor() ERC20("Triviacast Token", "TRIV") {}

    /// @notice Mint new tokens. Only owner (deployer) can mint.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
