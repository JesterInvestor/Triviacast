// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract RewardsDistributionRecipient is Ownable {
    address public rewardsDistribution;

    modifier onlyRewardsDistribution() {
        require(msg.sender == rewardsDistribution, "Caller is not rewardsDistribution");
        _;
    }

    function setRewardsDistribution(address _rewardsDistribution) external onlyOwner {
        require(_rewardsDistribution != address(0), "zero address");
        rewardsDistribution = _rewardsDistribution;
    }
}
