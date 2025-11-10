// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IQPoints
 * @notice Ledger for iQ point balances. Non-transferable reputation points.
 * @dev Authorized awarders (e.g., QuestManagerIQ) can add points. Owner can set awarders.
 */
contract IQPoints {
    address public owner;
    mapping(address => uint256) private _balances;
    mapping(address => bool) public awarder;

    event PointsAwarded(address indexed user, uint256 amount, uint256 newTotal, address indexed by);
    event AwarderSet(address indexed awarder, bool enabled);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() { require(msg.sender == owner, "IQ: not owner"); _; }
    modifier onlyAwarder() { require(awarder[msg.sender], "IQ: not awarder"); _; }

    constructor() { owner = msg.sender; }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "IQ: zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setAwarder(address a, bool enabled) external onlyOwner {
        awarder[a] = enabled;
        emit AwarderSet(a, enabled);
    }

    function award(address user, uint256 amount) external onlyAwarder {
        require(user != address(0), "IQ: zero user");
        require(amount > 0, "IQ: zero amount");
        uint256 newTotal = _balances[user] + amount;
        _balances[user] = newTotal;
        emit PointsAwarded(user, amount, newTotal, msg.sender);
    }

    function batchSet(address[] calldata users, uint256[] calldata totals) external onlyOwner {
        require(users.length == totals.length, "IQ: length mismatch");
        for (uint256 i = 0; i < users.length; i++) {
            _balances[users[i]] = totals[i];
            emit PointsAwarded(users[i], 0, totals[i], msg.sender);
        }
    }

    function getPoints(address user) external view returns (uint256) {
        return _balances[user];
    }
}
