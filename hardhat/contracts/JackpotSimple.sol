// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title JackpotSimple
 * @dev Lightweight jackpot contract for testing and local flows.
 * - Players may call `spin()` once every 24 hours.
 * - Owner can change the winning odds (basis points out of 10_000) via `setWinBp`.
 * - Owner can set a fixed prize amount (in prize token smallest units) via `setPrizeAmount`.
 * - Contract pays out from its balance of `prizeToken` when a win occurs.
 * NOTE: Randomness uses block-derived entropy and is NOT secure for high-value production use.
 */
contract JackpotSimple is Ownable {
    IERC20 public prizeToken;

    // win probability in basis points (0..10000). e.g. 1000 => 10%
    uint16 public winBp;

    // fixed prize amount in token units (smallest unit)
    uint256 public prizeAmount;

    // cooldown per address (seconds). default 24h
    uint256 public cooldown = 1 days;

    mapping(address => uint256) public lastSpinAt;

    event Spin(address indexed player, bool win, uint256 prize);
    event WinBpUpdated(uint16 newBp);
    event PrizeAmountUpdated(uint256 newAmount);
    event CooldownUpdated(uint256 newCooldown);
    event Deposited(address indexed from, uint256 amount);
    event Rescued(address indexed to, address token, uint256 amount);

    constructor(address _prizeToken, uint16 _initialWinBp, uint256 _initialPrize) {
        require(_prizeToken != address(0), "zero prize token");
        require(_initialWinBp <= 10000, "bp>10000");
        prizeToken = IERC20(_prizeToken);
        winBp = _initialWinBp;
        prizeAmount = _initialPrize;
    }

    /**
     * @dev Allow owner to update win probability in basis points (0..10000)
     */
    function setWinBp(uint16 _bp) external onlyOwner {
        require(_bp <= 10000, "bp>10000");
        winBp = _bp;
        emit WinBpUpdated(_bp);
    }

    /**
     * @dev Allow owner to change the fixed prize amount (token smallest units)
     */
    function setPrizeAmount(uint256 _amount) external onlyOwner {
        prizeAmount = _amount;
        emit PrizeAmountUpdated(_amount);
    }

    /**
     * @dev Allow owner to change cooldown (in seconds).
     */
    function setCooldown(uint256 _seconds) external onlyOwner {
        require(_seconds > 0, "cooldown>0");
        cooldown = _seconds;
        emit CooldownUpdated(_seconds);
    }

    /**
     * @dev Users call `spin` to try their luck. Enforces 24h cooldown by default.
     * Returns (win, prizePaid)
     */
    function spin() external returns (bool win, uint256 prizePaid) {
        require(block.timestamp - lastSpinAt[msg.sender] >= cooldown, "Too soon");
        lastSpinAt[msg.sender] = block.timestamp;

        // Basic pseudo-randomness --- NOT secure for high-value production
        uint256 entropy = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender, blockhash(block.number - 1))));
        uint256 roll = entropy % 10000; // 0..9999

        if (roll < winBp && prizeAmount > 0) {
            uint256 bal = prizeToken.balanceOf(address(this));
            if (bal >= prizeAmount) {
                prizeToken.transfer(msg.sender, prizeAmount);
                emit Spin(msg.sender, true, prizeAmount);
                return (true, prizeAmount);
            }
            // if not enough balance, consider as no prize
        }

        emit Spin(msg.sender, false, 0);
        return (false, 0);
    }

    /**
     * @dev Allow anyone to deposit prize tokens into the contract. Sender must approve tokens first.
     */
    function depositPrize(uint256 amount) external {
        require(amount > 0, "amount>0");
        prizeToken.transferFrom(msg.sender, address(this), amount);
        emit Deposited(msg.sender, amount);
    }

    /**
     * @dev Owner rescue tokens from contract (including prize token)
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "zero to");
        IERC20(token).transfer(to, amount);
        emit Rescued(to, token, amount);
    }

    /**
     * @dev View helper for current contract prize balance
     */
    function prizeBalance() external view returns (uint256) {
        return prizeToken.balanceOf(address(this));
    }
}
