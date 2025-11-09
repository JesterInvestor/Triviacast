// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * Jackpot contract
 * - Requires a USDC payment per spin (transferFrom to feeReceiver / distributor)
 * - Verifies player eligibility via TriviaPoints (>= threshold)
 * - Enforces 1 spin per 24h per wallet
 * - Uses Chainlink VRF v2.5 for provable randomness
 * - Selects prize tier on-chain and pays TRIV tokens from the contract balance (if available)
 *
 * NOTE: Contract must be added as a consumer to the VRF subscription and funded with LINK as required by Chainlink.
 * Prize distribution assumes this contract holds enough TRIV to cover payouts.
 */

// Chainlink VRF v2.5 imports
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ITriviaPoints {
    function getPoints(address wallet) external view returns (uint256);
}

contract Jackpot is VRFConsumerBaseV2Plus {
    struct Tier { uint256 amount; uint16 bp; } // amount in TRIV token units, basis points out of 10_000 for odds
    struct PendingSpin { address player; bool settled; uint256 prize; }

    event SpinRequested(uint256 indexed requestId, address indexed player);
    event SpinResult(uint256 indexed requestId, address indexed player, uint256 prize);
    event Paid(address indexed player, address indexed token, uint256 amount);
    event SpinPurchased(address indexed player, uint256 count, uint256 totalPaid);

    error NotEligible();
    error TooSoon();
    error PaymentFailed();
    error NoSubscription();
    error InvalidConfig();

    // Immutable / core config
    // VRF v2.5 uses uint256 subscription id and exposes s_vrfCoordinator in the base
    uint256 public immutable subscriptionId;
    bytes32 public immutable keyHash; // gas lane

    // Admin
    address public feeReceiver; // Distributor / treasury receiving USDC payments

    // External contracts
    IERC20 public usdc; // payment token (6 decimals typical)
    IERC20 public triv; // reward token to pay out prizes
    ITriviaPoints public triviaPoints;

    // Game config
    uint256 public price; // USDC units (e.g., 0.5 USDC => 500000 with 6 decimals)
    uint256 public pointsThreshold; // e.g., 100_000
    Tier[] public tiers; // sum of bp must be 10_000

    // State
    mapping(address => uint256) public lastSpinAt; // timestamp
    mapping(address => uint256) public spinCredits; // pre-paid spins available
    mapping(uint256 => PendingSpin) public pending; // requestId => pending data

    uint32 public callbackGasLimit = 200_000;
    uint16 public requestConfirmations = 3;
    uint32 public numWords = 1;

    constructor(
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash,
        address _usdc,
        address _triv,
        address _triviaPoints,
        address _feeReceiver,
        uint256 _price,
        uint256 _pointsThreshold
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        require(_vrfCoordinator != address(0) && _usdc != address(0) && _triv != address(0) && _triviaPoints != address(0) && _feeReceiver != address(0), "zero addr");
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        usdc = IERC20(_usdc);
        triv = IERC20(_triv);
        triviaPoints = ITriviaPoints(_triviaPoints);
        feeReceiver = _feeReceiver;
        price = _price;
        pointsThreshold = _pointsThreshold;
    // owner is managed by VRFConsumerBaseV2Plus' ConfirmedOwner machinery

        // Default tiers example (can be updated by owner):
        // 0.01% 10,000,000; 0.49% 10,000; 9.5% 1,000; 30% 100; 60% 0
        tiers.push(Tier({amount: 10_000_000 * 1e18, bp: 1}));
        tiers.push(Tier({amount: 10_000 * 1e18, bp: 49}));
        tiers.push(Tier({amount: 1_000 * 1e18, bp: 950}));
        tiers.push(Tier({amount: 100 * 1e18, bp: 3000}));
        tiers.push(Tier({amount: 0, bp: 6000}));
    }

    // Admin setters
    // Ownership is managed by inherited ConfirmedOwner; use transferOwnership/acceptOwnership
    function setFeeReceiver(address _to) external onlyOwner { require(_to != address(0), "zero receiver"); feeReceiver = _to; }
    function setPrice(uint256 _price) external onlyOwner { price = _price; }
    function setPointsThreshold(uint256 _threshold) external onlyOwner { pointsThreshold = _threshold; }
    function setCallbackGas(uint32 _gas) external onlyOwner { callbackGasLimit = _gas; }
    function setConfirmations(uint16 _conf) external onlyOwner { requestConfirmations = _conf; }
    function setNumWords(uint32 _n) external onlyOwner { numWords = _n; }

    function setTiers(Tier[] calldata newTiers) external onlyOwner {
        delete tiers;
        uint256 sum;
        for (uint256 i = 0; i < newTiers.length; i++) {
            tiers.push(newTiers[i]);
            sum += newTiers[i].bp;
        }
        require(sum == 10_000, "bp sum != 10000");
    }

    // Purchase spins upfront (USDC -> feeReceiver). Player must approve this contract to spend USDC.
    function buySpins(uint256 count) external {
        require(count > 0, "count=0");
        uint256 total = price * count;
        bool ok = usdc.transferFrom(msg.sender, feeReceiver, total);
        if (!ok) revert PaymentFailed();
        spinCredits[msg.sender] += count;
        emit Paid(msg.sender, address(usdc), total);
        emit SpinPurchased(msg.sender, count, total);
    }

    // Spin entry point: now consumes 1 credit, checks eligibility and 24h cooldown
    function spin() external returns (uint256 requestId) {
        // Eligibility
        uint256 points = triviaPoints.getPoints(msg.sender);
        if (points < pointsThreshold) revert NotEligible();
        if (block.timestamp - lastSpinAt[msg.sender] < 1 days) revert TooSoon();

        // Consume one pre-paid credit
        uint256 credits = spinCredits[msg.sender];
        require(credits > 0, "no credits");
        unchecked { spinCredits[msg.sender] = credits - 1; }

        // Request randomness
        if (subscriptionId == 0) revert NoSubscription();
        // VRF v2.5 request format with extra args; set nativePayment=false to pay in LINK via subscription
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({ nativePayment: false })
                )
            })
        );
        pending[requestId] = PendingSpin({player: msg.sender, settled: false, prize: 0});
        emit SpinRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        PendingSpin storage p = pending[requestId];
        // If unknown request (should not happen), ignore
        if (p.player == address(0) || p.settled) return;

        uint256 rnd = randomWords[0] % 10_000; // 0..9999
        uint256 cumulative;
        uint256 prize;
        for (uint256 i = 0; i < tiers.length; i++) {
            cumulative += tiers[i].bp;
            if (rnd < cumulative) { prize = tiers[i].amount; break; }
        }
        p.prize = prize;
        p.settled = true;
        lastSpinAt[p.player] = block.timestamp;

        // Attempt immediate payout if prize > 0 and balance sufficient
        if (prize > 0) {
            uint256 bal = triv.balanceOf(address(this));
            if (bal >= prize) {
                // best-effort transfer; ignore return value if token non-standard
                triv.transfer(p.player, prize);
            }
        }

        emit SpinResult(requestId, p.player, prize);
    }

    // Views
    function getTiers() external view returns (Tier[] memory list) {
        list = new Tier[](tiers.length);
        for (uint256 i = 0; i < tiers.length; i++) list[i] = tiers[i];
    }

    // Admin rescues
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        require(to != address(0), "bad to");
        IERC20(token).transfer(to, amount);
    }
}
