// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IIQPoints { function award(address user, uint256 amount) external; }

/**
 * @title QuestManagerIQ
 * @notice Manages daily quests awarding iQ points.
 * @dev Each quest has amount + enabled; users can claim once per UTC day (timestamp/86400).
 */
contract QuestManagerIQ {
    struct QuestConfig { uint256 amount; bool enabled; }

    address public owner;
    IIQPoints public iqPoints;
    bool public paused;

    // quest ids examples: 1=Daily Share (+5000), 2=Daily Quiz Play (+1000), 3=Daily Challenge (+10000)
    mapping(uint8 => QuestConfig) public quest;
    // user => questId => last day index claimed
    mapping(address => mapping(uint8 => uint256)) public lastClaimDay;

    event QuestClaimed(address indexed user, uint8 indexed questId, uint256 amount, uint256 day);
    event QuestUpdated(uint8 indexed questId, uint256 amount, bool enabled);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event Paused(bool status);
    event IQPointsSet(address indexed newAddress);

    modifier onlyOwner() { require(msg.sender == owner, "Quest: not owner"); _; }
    modifier notPaused() { require(!paused, "Quest: paused"); _; }

    constructor(address iqPointsAddress) {
        owner = msg.sender;
        iqPoints = IIQPoints(iqPointsAddress);
        quest[1] = QuestConfig(5000, true);
        quest[2] = QuestConfig(1000, true);
        quest[3] = QuestConfig(10000, true);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Quest: zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function setIQPoints(address addr) external onlyOwner {
        require(addr != address(0), "Quest: zero iq");
        iqPoints = IIQPoints(addr);
        emit IQPointsSet(addr);
    }

    function setQuest(uint8 id, uint256 amount, bool enabled) external onlyOwner {
        require(id > 0, "Quest: id");
        quest[id] = QuestConfig(amount, enabled);
        emit QuestUpdated(id, amount, enabled);
    }

    function setPaused(bool status) external onlyOwner {
        paused = status;
        emit Paused(status);
    }

    function currentDay() public view returns (uint256) {
        return block.timestamp / 86400;
    }

    function claim(uint8 id) public notPaused {
        QuestConfig memory qc = quest[id];
        require(qc.enabled, "Quest: disabled");
        require(qc.amount > 0, "Quest: zero amount");
        uint256 day = currentDay();
        require(lastClaimDay[msg.sender][id] < day, "Quest: already claimed");
        lastClaimDay[msg.sender][id] = day;
        iqPoints.award(msg.sender, qc.amount);
        emit QuestClaimed(msg.sender, id, qc.amount, day);
    }

    function claimShare() external { claim(1); }
    function claimDailyQuizPlay() external { claim(2); }
    function claimDailyChallenge() external { claim(3); }
}
