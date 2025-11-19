// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @notice Simple staking with configurable rewardRate (tokens per second).
 * - Users stake `stakeToken` and earn `rewardToken` at `rewardRate` (tokens/sec) distributed pro-rata by stake.
 * - Owner can set rewardRate via setRewardRate. Calls updatePool() first to preserve accrual.
 */
contract StakingWithRewards is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakeToken;
    IERC20 public immutable rewardToken;

    // reward rate in tokens per second
    uint256 public rewardRate;

    // accrual accounting
    uint256 public accRewardPerShare; // scaled by 1e12
    uint256 public lastRewardTime;
    uint256 public totalStaked;

    struct UserInfo {
        uint256 amount;      // staked amount
        uint256 rewardDebt;  // used to calculate pending
    }

    mapping(address => UserInfo) public userInfo;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    constructor(address _stakeToken, address _rewardToken, uint256 _rewardRate) {
        require(_stakeToken != address(0) && _rewardToken != address(0), "zero addr");
        stakeToken = IERC20(_stakeToken);
        rewardToken = IERC20(_rewardToken);
        rewardRate = _rewardRate;
        lastRewardTime = block.timestamp;
    }

    // update accRewardPerShare up to current time
    modifier updatePool() {
        if (block.timestamp > lastRewardTime) {
            uint256 elapsed = block.timestamp - lastRewardTime;
            if (totalStaked > 0) {
                uint256 reward = elapsed * rewardRate;
                // accRewardPerShare uses 1e12 precision
                accRewardPerShare += (reward * 1e12) / totalStaked;
            }
            lastRewardTime = block.timestamp;
        }
        _;
    }

    // view pending rewards for a user
    function pendingReward(address user) external view returns (uint256) {
        UserInfo storage u = userInfo[user];
        uint256 _acc = accRewardPerShare;
        if (block.timestamp > lastRewardTime && totalStaked > 0) {
            uint256 elapsed = block.timestamp - lastRewardTime;
            uint256 reward = elapsed * rewardRate;
            _acc += (reward * 1e12) / totalStaked;
        }
        return (u.amount * _acc) / 1e12 - u.rewardDebt;
    }

    // stake (approve first)
    function stake(uint256 amount) external nonReentrant updatePool {
        require(amount > 0, "zero");
        UserInfo storage u = userInfo[msg.sender];
        // pay pending
        uint256 pending = (u.amount * accRewardPerShare) / 1e12 - u.rewardDebt;
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            emit RewardPaid(msg.sender, pending);
        }
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        u.amount += amount;
        totalStaked += amount;
        u.rewardDebt = (u.amount * accRewardPerShare) / 1e12;
        emit Staked(msg.sender, amount);
    }

    // withdraw and claim rewards
    function withdraw(uint256 amount) external nonReentrant updatePool {
        UserInfo storage u = userInfo[msg.sender];
        require(amount <= u.amount, "insufficient");
        uint256 pending = (u.amount * accRewardPerShare) / 1e12 - u.rewardDebt;
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            emit RewardPaid(msg.sender, pending);
        }
        u.amount -= amount;
        totalStaked -= amount;
        stakeToken.safeTransfer(msg.sender, amount);
        u.rewardDebt = (u.amount * accRewardPerShare) / 1e12;
        emit Withdrawn(msg.sender, amount);
    }

    // emergency withdraw without rewards
    function emergencyWithdraw() external nonReentrant {
        UserInfo storage u = userInfo[msg.sender];
        uint256 amt = u.amount;
        require(amt > 0, "zero");
        u.amount = 0;
        u.rewardDebt = 0;
        totalStaked -= amt;
        stakeToken.safeTransfer(msg.sender, amt);
        emit Withdrawn(msg.sender, amt);
    }

    // owner sets reward rate (tokens per second). Updates pool before changing.
    function setRewardRate(uint256 newRate) external onlyOwner updatePool {
        uint256 old = rewardRate;
        rewardRate = newRate;
        emit RewardRateUpdated(old, newRate);
    }

    // requires owner to fund the contract with rewardToken to pay rewards
    function _safeRewardTransfer(address to, uint256 amount) internal {
        uint256 bal = rewardToken.balanceOf(address(this));
        if (amount > bal) {
            rewardToken.safeTransfer(to, bal);
        } else {
            rewardToken.safeTransfer(to, amount);
        }
    }

    // convenience: owner can recover extra tokens (but not user stakes)
    function recoverERC20(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(stakeToken), "cannot recover stake token");
        IERC20(token).safeTransfer(to, amount);
    }
}
