// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @notice Staking contract with configurable rewards expressed as "per-day" TRIV.
 * - Users stake 'stakeToken' and earn 'rewardToken' (TRIV) at a rate derived from dailyReward.
 * - Owner sets dailyReward (tokens-per-day, in token smallest unit). rewardRate = dailyReward / 86400 (tokens/sec).
 * - Owner must fund the contract with TRIV tokens for payouts.
 *
 * Rounding note: rewardRate is integer division newDaily / 86400. If newDaily < 86400 (in wei),
 * rewardRate will be zero. To avoid that, specify dailyReward in token smallest units (e.g., 18-decimals).
 */
contract StakingWithRewards is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakeToken;
    IERC20 public immutable rewardToken; // TRIV

    // Reward configuration
    uint256 public dailyReward; // tokens per day (in smallest units)
    uint256 public rewardRate;  // tokens per second (derived from dailyReward): dailyReward / 86400

    // accrual accounting
    uint256 public accRewardPerShare; // scaled by 1e12
    uint256 public lastRewardTime;
    uint256 public totalStaked;

    uint256 private constant SECONDS_PER_DAY = 86400;
    uint256 private constant ACC_PRECISION = 1e12;

    struct UserInfo {
        uint256 amount;      // staked amount
        uint256 rewardDebt;  // used to calculate pending
    }

    mapping(address => UserInfo) public userInfo;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);
    event DailyRewardUpdated(uint256 oldDaily, uint256 newDaily);
    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    constructor(address _stakeToken, address _rewardToken, uint256 _dailyReward) {
        require(_stakeToken != address(0) && _rewardToken != address(0), "zero addr");
        stakeToken = IERC20(_stakeToken);
        rewardToken = IERC20(_rewardToken);
        dailyReward = _dailyReward;
        rewardRate = _dailyReward / SECONDS_PER_DAY;
        lastRewardTime = block.timestamp;
    }

    // update accRewardPerShare up to current time
    modifier updatePool() {
        if (block.timestamp > lastRewardTime) {
            uint256 elapsed = block.timestamp - lastRewardTime;
            if (totalStaked > 0 && rewardRate > 0) {
                uint256 reward = elapsed * rewardRate;
                // accRewardPerShare uses ACC_PRECISION
                accRewardPerShare += (reward * ACC_PRECISION) / totalStaked;
            }
            lastRewardTime = block.timestamp;
        }
        _;
    }

    // view pending rewards for a user
    function pendingReward(address user) external view returns (uint256) {
        UserInfo storage u = userInfo[user];
        uint256 _acc = accRewardPerShare;
        if (block.timestamp > lastRewardTime && totalStaked > 0 && rewardRate > 0) {
            uint256 elapsed = block.timestamp - lastRewardTime;
            uint256 reward = elapsed * rewardRate;
            _acc += (reward * ACC_PRECISION) / totalStaked;
        }
        return (u.amount * _acc) / ACC_PRECISION - u.rewardDebt;
    }

    // stake (approve first)
    function stake(uint256 amount) external nonReentrant updatePool {
        require(amount > 0, "zero");
        UserInfo storage u = userInfo[msg.sender];
        // pay pending
        uint256 pending = (u.amount * accRewardPerShare) / ACC_PRECISION - u.rewardDebt;
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            emit RewardPaid(msg.sender, pending);
        }
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        u.amount += amount;
        totalStaked += amount;
        u.rewardDebt = (u.amount * accRewardPerShare) / ACC_PRECISION;
        emit Staked(msg.sender, amount);
    }

    // withdraw and claim rewards
    function withdraw(uint256 amount) external nonReentrant updatePool {
        UserInfo storage u = userInfo[msg.sender];
        require(amount <= u.amount, "insufficient");
        uint256 pending = (u.amount * accRewardPerShare) / ACC_PRECISION - u.rewardDebt;
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            emit RewardPaid(msg.sender, pending);
        }
        u.amount -= amount;
        totalStaked -= amount;
        stakeToken.safeTransfer(msg.sender, amount);
        u.rewardDebt = (u.amount * accRewardPerShare) / ACC_PRECISION;
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

    /**
     * @notice Owner sets daily rewards in token smallest units (e.g., wei). Contract must be funded with enough TRIV.
     * @dev updatePool modifier runs first to preserve accrual with the old rate.
     */
    function setDailyReward(uint256 newDaily) external onlyOwner updatePool {
        uint256 oldDaily = dailyReward;
        uint256 oldRate = rewardRate;
        dailyReward = newDaily;
        // integer division: rounding down. If this is too coarse, increase newDaily or adopt higher precision accounting.
        rewardRate = newDaily / SECONDS_PER_DAY;
        emit DailyRewardUpdated(oldDaily, newDaily);
        emit RewardRateUpdated(oldRate, rewardRate);
    }

    // owner can still directly set tokens-per-second if desired
    function setRewardRate(uint256 newRate) external onlyOwner updatePool {
        uint256 old = rewardRate;
        rewardRate = newRate;
        // keep dailyReward in sync for UX (approx)
        dailyReward = newRate * SECONDS_PER_DAY;
        emit RewardRateUpdated(old, newRate);
    }

    // requires owner to fund the contract with rewardToken (TRIV) to pay rewards
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
