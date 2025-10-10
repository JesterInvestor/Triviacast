// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface ITriviaPoints {
    function getPoints(address wallet) external view returns (uint256);
    function getLeaderboard(uint256 limit) external view returns (address[] memory addresses, uint256[] memory points);
}

/**
 * @title TriviacastDistributor
 * @notice Distributes TRIV ERC20 tokens to users based on TriviaPoints standings.
 * - dailyClaim: any wallet with >0 T Points can claim a fixed token amount once per cooldown period
 * - airdropTop5: owner can airdrop a fixed token amount to top 5 wallets on the leaderboard
 */
contract TriviacastDistributor is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable triv;
    ITriviaPoints public immutable triviaPoints;

    // Configurable amounts (in token's smallest unit, e.g., wei for 18 decimals)
    uint256 public dailyAmount;     // e.g., 0.05 * 1e18
    uint256 public topAmount;       // e.g., 0.50 * 1e18 per wallet

    // Cooldowns
    uint256 public claimCooldown = 1 days;
    uint256 public top5Cooldown = 1 days;

    // State
    mapping(address => uint256) public lastClaimAt;
    uint256 public lastTop5AirdropAt;

    // Events
    event DailyClaim(address indexed wallet, uint256 amount, uint256 when);
    event Top5Airdrop(address[] recipients, uint256 amountEach, uint256 when);
    event DailyAmountUpdated(uint256 amount);
    event TopAmountUpdated(uint256 amount);
    event ClaimCooldownUpdated(uint256 seconds_);
    event Top5CooldownUpdated(uint256 seconds_);

    constructor(
        address owner_,
        address trivToken,
        address triviaPointsContract,
        uint256 dailyAmount_,
        uint256 topAmount_
    ) Ownable(owner_) {
        require(trivToken != address(0), "TRIV token required");
        require(triviaPointsContract != address(0), "TriviaPoints required");
        triv = IERC20(trivToken);
        triviaPoints = ITriviaPoints(triviaPointsContract);
        dailyAmount = dailyAmount_;
        topAmount = topAmount_;
    }

    // ============ Admin ============
    function setDailyAmount(uint256 amount) external onlyOwner {
        dailyAmount = amount;
        emit DailyAmountUpdated(amount);
    }

    function setTopAmount(uint256 amount) external onlyOwner {
        topAmount = amount;
        emit TopAmountUpdated(amount);
    }

    function setClaimCooldown(uint256 seconds_) external onlyOwner {
        claimCooldown = seconds_;
        emit ClaimCooldownUpdated(seconds_);
    }

    function setTop5Cooldown(uint256 seconds_) external onlyOwner {
        top5Cooldown = seconds_;
        emit Top5CooldownUpdated(seconds_);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // Allow owner to recover any ERC20 sent to this contract (including TRIV)
    function recoverTokens(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "to=0");
        IERC20(token).safeTransfer(to, amount);
    }

    // ============ User Flow ============
    function dailyClaim() external nonReentrant whenNotPaused {
        require(dailyAmount > 0, "daily=0");
        require(triviaPoints.getPoints(msg.sender) > 0, "no T points");
        uint256 last = lastClaimAt[msg.sender];
        require(block.timestamp >= last + claimCooldown, "cooldown");

        lastClaimAt[msg.sender] = block.timestamp;
        triv.safeTransfer(msg.sender, dailyAmount);
        emit DailyClaim(msg.sender, dailyAmount, block.timestamp);
    }

    // ============ Owner Flow ============
    function airdropTop5() external nonReentrant onlyOwner whenNotPaused {
        require(topAmount > 0, "top=0");
        require(block.timestamp >= lastTop5AirdropAt + top5Cooldown, "top cooldown");

        (address[] memory addrs, uint256[] memory pts) = triviaPoints.getLeaderboard(5);
        uint256 n = addrs.length;
        require(n > 0, "no wallets");

        // Distribute to up to top 5 with points > 0
        address[] memory paid = new address[](n);
        uint256 paidCount = 0;
        for (uint256 i = 0; i < n; i++) {
            if (addrs[i] != address(0) && pts[i] > 0) {
                triv.safeTransfer(addrs[i], topAmount);
                paid[paidCount] = addrs[i];
                paidCount++;
            }
        }

        lastTop5AirdropAt = block.timestamp;

        // Emit only the paid subset
        address[] memory recipients = new address[](paidCount);
        for (uint256 j = 0; j < paidCount; j++) {
            recipients[j] = paid[j];
        }
        emit Top5Airdrop(recipients, topAmount, block.timestamp);
    }
}
