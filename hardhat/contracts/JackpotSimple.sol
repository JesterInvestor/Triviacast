// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title JackpotSimple
 * @dev Jackpot using Chainlink VRF v2 for randomness. Players may call `spin()` once every `cooldown` seconds.
 * Owner can change winning odds and prize amount. Contract pays out from its prize token balance.
 */
contract JackpotSimple is VRFConsumerBaseV2, Ownable {
    VRFCoordinatorV2Interface public immutable COORDINATOR;
    uint64 public immutable subscriptionId;
    bytes32 public immutable keyHash;

    IERC20 public prizeToken;

    // win probability in basis points (0..10000). e.g. 1000 => 10%
    uint16 public winBp;

    // fixed prize amount in token units (smallest unit)
    uint256 public prizeAmount;

    // cooldown per address (seconds). default 24h
    uint256 public cooldown = 1 days;

    mapping(address => uint256) public lastSpinAt;
    mapping(address => uint256) public lastPrize;
    mapping(address => bool) public lastWin;

    // pending request mapping
    mapping(uint256 => address) public pendingPlayer;

    // VRF params
    uint32 public callbackGasLimit = 200000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;

    event SpinRequested(uint256 indexed requestId, address indexed player);
    event SpinResult(uint256 indexed requestId, address indexed player, bool win, uint256 prize);
    event WinBpUpdated(uint16 newBp);
    event PrizeAmountUpdated(uint256 newAmount);
    event CooldownUpdated(uint256 newCooldown);
    event Deposited(address indexed from, uint256 amount);
    event Rescued(address indexed to, address token, uint256 amount);

    constructor(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        address _prizeToken,
        uint16 _initialWinBp,
        uint256 _initialPrize
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        require(_vrfCoordinator != address(0), "zero vrf");
        require(_prizeToken != address(0), "zero prize token");
        require(_initialWinBp <= 10000, "bp>10000");
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        prizeToken = IERC20(_prizeToken);
        winBp = _initialWinBp;
        prizeAmount = _initialPrize;
    }

    function setWinBp(uint16 _bp) external onlyOwner {
        require(_bp <= 10000, "bp>10000");
        winBp = _bp;
        emit WinBpUpdated(_bp);
    }

    function setPrizeAmount(uint256 _amount) external onlyOwner {
        prizeAmount = _amount;
        emit PrizeAmountUpdated(_amount);
    }

    function setCooldown(uint256 _seconds) external onlyOwner {
        require(_seconds > 0, "cooldown>0");
        cooldown = _seconds;
        emit CooldownUpdated(_seconds);
    }

    function setVrfParams(uint32 _callbackGasLimit, uint16 _requestConfirmations, uint32 _numWords) external onlyOwner {
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
    }

    /**
     * @dev Request randomness and record pending player. Returns the VRF requestId.
     */
    function spin() external returns (uint256 requestId) {
        require(block.timestamp - lastSpinAt[msg.sender] >= cooldown, "Too soon");
        require(subscriptionId != 0, "No subscription");
        lastSpinAt[msg.sender] = block.timestamp;

        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        pendingPlayer[requestId] = msg.sender;
        emit SpinRequested(requestId, msg.sender);
        return requestId;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address player = pendingPlayer[requestId];
        if (player == address(0)) {
            return;
        }
        delete pendingPlayer[requestId];

        uint256 rnd = randomWords[0] % 10000;
        bool win = false;
        uint256 paid = 0;
        if (rnd < winBp && prizeAmount > 0) {
            uint256 bal = prizeToken.balanceOf(address(this));
            if (bal >= prizeAmount) {
                prizeToken.transfer(player, prizeAmount);
                lastPrize[player] = prizeAmount;
                lastWin[player] = true;
                win = true;
                paid = prizeAmount;
            }
        }

        if (!win) {
            lastPrize[player] = 0;
            lastWin[player] = false;
        }

        emit SpinResult(requestId, player, win, paid);
    }

    function depositPrize(uint256 amount) external {
        require(amount > 0, "amount>0");
        prizeToken.transferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero to");
        IERC20(token).transfer(to, amount);
        emit Rescued(to, token, amount);
    }

    function prizeBalance() external view returns (uint256) {
        return prizeToken.balanceOf(address(this));
    }
}
