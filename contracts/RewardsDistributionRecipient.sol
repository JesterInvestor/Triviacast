// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev Simple helper contract to allow an owner to set a rewards distributor
 * and provide an onlyRewardsDistribution modifier used by staking contracts.
 */
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
