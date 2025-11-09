// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title TriviaJackpot
 * @dev Manages jackpot spins with on-chain randomness for Triviacast
 * Uses a simple pseudo-random approach that can be upgraded to Chainlink VRF later
 */
contract TriviaJackpot {
    // Prize tiers in $TRIV tokens (with 18 decimals)
    uint256 public constant JACKPOT_PRIZE = 10_000_000 * 10**18;      // 10M $TRIV - 0.1% chance
    uint256 public constant MEGA_PRIZE = 1_000_000 * 10**18;          // 1M $TRIV - 1% chance
    uint256 public constant BIG_PRIZE = 100_000 * 10**18;             // 100K $TRIV - 5% chance
    uint256 public constant MEDIUM_PRIZE = 10_000 * 10**18;           // 10K $TRIV - 10% chance
    uint256 public constant SMALL_PRIZE = 1_000 * 10**18;             // 1K $TRIV - 20% chance
    uint256 public constant TINY_PRIZE = 100 * 10**18;                // 100 $TRIV - 63.9% chance
    
    // Prize probabilities (out of 1000 for precision)
    uint256 public constant JACKPOT_ODDS = 1;      // 0.1%
    uint256 public constant MEGA_ODDS = 10;        // 1%
    uint256 public constant BIG_ODDS = 50;         // 5%
    uint256 public constant MEDIUM_ODDS = 100;     // 10%
    uint256 public constant SMALL_ODDS = 200;      // 20%
    uint256 public constant TINY_ODDS = 639;       // 63.9%
    
    // Spin cost in $TRIV (with 18 decimals)
    uint256 public constant SPIN_COST = 500 * 10**18; // 500 $TRIV per spin
    
    // Owner and operator addresses
    address public owner;
    address public operator;
    
    // $TRIV token address (will be set by owner)
    address public trivToken;
    
    // Jackpot pool tracking
    uint256 public jackpotPool;
    uint256 public totalSpins;
    uint256 public totalPaidOut;
    
    // Spin history
    struct SpinResult {
        address player;
        uint256 prize;
        uint256 timestamp;
        uint256 randomSeed;
    }
    
    mapping(address => SpinResult[]) public playerSpins;
    SpinResult[] public allSpins;
    
    // Events
    event SpinExecuted(address indexed player, uint256 prize, uint256 timestamp, uint256 randomSeed);
    event JackpotFunded(uint256 amount);
    event PrizeClaimed(address indexed player, uint256 amount);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "Only operator can perform this action");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        operator = msg.sender;
    }
    
    /**
     * @dev Set the $TRIV token address (only owner)
     */
    function setTrivToken(address _trivToken) external onlyOwner {
        require(_trivToken != address(0), "Invalid token address");
        trivToken = _trivToken;
    }
    
    /**
     * @dev Set the operator address (only owner)
     */
    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "Invalid operator address");
        operator = _operator;
    }
    
    /**
     * @dev Fund the jackpot pool (anyone can fund it)
     */
    function fundJackpot(uint256 amount) external {
        require(trivToken != address(0), "TRIV token not set");
        // In a real implementation, this would transfer TRIV tokens
        // For now, we just track the amount
        jackpotPool += amount;
        emit JackpotFunded(amount);
    }
    
    /**
     * @dev Generate pseudo-random number for spin
     * NOTE: This is a simplified version. In production, use Chainlink VRF for true randomness
     */
    function _generateRandomNumber(address player, uint256 nonce) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,  // More secure than block.difficulty in PoS
            player,
            nonce,
            totalSpins
        )));
    }
    
    /**
     * @dev Determine prize based on random number
     */
    function _determinePrize(uint256 randomNumber) internal pure returns (uint256) {
        uint256 roll = randomNumber % 1000; // Get number 0-999
        
        if (roll < JACKPOT_ODDS) {
            return JACKPOT_PRIZE;
        } else if (roll < JACKPOT_ODDS + MEGA_ODDS) {
            return MEGA_PRIZE;
        } else if (roll < JACKPOT_ODDS + MEGA_ODDS + BIG_ODDS) {
            return BIG_PRIZE;
        } else if (roll < JACKPOT_ODDS + MEGA_ODDS + BIG_ODDS + MEDIUM_ODDS) {
            return MEDIUM_PRIZE;
        } else if (roll < JACKPOT_ODDS + MEGA_ODDS + BIG_ODDS + MEDIUM_ODDS + SMALL_ODDS) {
            return SMALL_PRIZE;
        } else {
            return TINY_PRIZE;
        }
    }
    
    /**
     * @dev Execute a spin (only operator or owner)
     * In production, this would be called by the player, but for now operator executes
     */
    function spin(address player) external onlyOperator returns (uint256 prize) {
        require(player != address(0), "Invalid player address");
        require(trivToken != address(0), "TRIV token not set");
        
        // Generate random number
        uint256 randomSeed = _generateRandomNumber(player, totalSpins);
        
        // Determine prize
        prize = _determinePrize(randomSeed);
        
        // Update stats
        totalSpins++;
        totalPaidOut += prize;
        
        // Record spin
        SpinResult memory result = SpinResult({
            player: player,
            prize: prize,
            timestamp: block.timestamp,
            randomSeed: randomSeed
        });
        
        playerSpins[player].push(result);
        allSpins.push(result);
        
        emit SpinExecuted(player, prize, block.timestamp, randomSeed);
        
        return prize;
    }
    
    /**
     * @dev Get player's spin history
     */
    function getPlayerSpins(address player) external view returns (SpinResult[] memory) {
        return playerSpins[player];
    }
    
    /**
     * @dev Get total number of spins
     */
    function getTotalSpins() external view returns (uint256) {
        return totalSpins;
    }
    
    /**
     * @dev Get jackpot pool size
     */
    function getJackpotPool() external view returns (uint256) {
        return jackpotPool;
    }
    
    /**
     * @dev Get all prize amounts and odds for display
     */
    function getPrizeInfo() external pure returns (
        uint256[] memory prizes,
        uint256[] memory odds
    ) {
        prizes = new uint256[](6);
        odds = new uint256[](6);
        
        prizes[0] = JACKPOT_PRIZE;
        prizes[1] = MEGA_PRIZE;
        prizes[2] = BIG_PRIZE;
        prizes[3] = MEDIUM_PRIZE;
        prizes[4] = SMALL_PRIZE;
        prizes[5] = TINY_PRIZE;
        
        odds[0] = JACKPOT_ODDS;
        odds[1] = MEGA_ODDS;
        odds[2] = BIG_ODDS;
        odds[3] = MEDIUM_ODDS;
        odds[4] = SMALL_ODDS;
        odds[5] = TINY_ODDS;
        
        return (prizes, odds);
    }
    
    /**
     * @dev Withdraw funds (only owner) - for emergency use
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= jackpotPool, "Insufficient funds");
        jackpotPool -= amount;
        // In production, transfer TRIV tokens
    }
    
    /**
     * @dev Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }
}
