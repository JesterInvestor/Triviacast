// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title TriviaPoints
 * @dev Manages T points for Triviacast users based on their wallet addresses
 */
contract TriviaPoints {
    // Mapping from wallet address to T points
    mapping(address => uint256) private tPoints;
    
    // Array to track all wallets that have earned points (for leaderboard)
    address[] private wallets;
    
    // Mapping to check if a wallet is already in the array
    mapping(address => bool) private isWalletTracked;
    
    // Owner of the contract (can add points for users)
    address public owner;
    
    // Events
    event PointsAdded(address indexed wallet, uint256 amount, uint256 newTotal);
    event PointsUpdated(address indexed wallet, uint256 newTotal);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Add points to a wallet address (only the wallet owner can add points to themselves)
     * @param wallet The wallet address to add points to
     * @param amount The amount of points to add
     */
    function addPoints(address wallet, uint256 amount) external {
        require(wallet != address(0), "Invalid wallet address");
        require(amount > 0, "Amount must be greater than zero");
        require(wallet == msg.sender, "Can only add points to your own wallet");
        
        // Track wallet if not already tracked
        if (!isWalletTracked[wallet]) {
            wallets.push(wallet);
            isWalletTracked[wallet] = true;
        }
        
        tPoints[wallet] += amount;
        emit PointsAdded(wallet, amount, tPoints[wallet]);
    }
    
    /**
     * @dev Get points for a specific wallet
     * @param wallet The wallet address to query
     * @return The amount of T points the wallet has
     */
    function getPoints(address wallet) external view returns (uint256) {
        return tPoints[wallet];
    }
    
    /**
     * @dev Update points for a wallet (only owner)
     * @param wallet The wallet address to update
     * @param newTotal The new total points
     */
    function updatePoints(address wallet, uint256 newTotal) external onlyOwner {
        require(wallet != address(0), "Invalid wallet address");
        
        // Track wallet if not already tracked
        if (!isWalletTracked[wallet] && newTotal > 0) {
            wallets.push(wallet);
            isWalletTracked[wallet] = true;
        }
        
        tPoints[wallet] = newTotal;
        emit PointsUpdated(wallet, newTotal);
    }
    
    /**
     * @dev Get the leaderboard (top wallets by points)
     * @param limit Maximum number of entries to return
     * @return addresses Array of wallet addresses
     * @return points Array of T points corresponding to each address
     */
    function getLeaderboard(uint256 limit) external view returns (address[] memory addresses, uint256[] memory points) {
        uint256 walletsCount = wallets.length;
        if (walletsCount == 0) {
            return (new address[](0), new uint256[](0));
        }
        
        // Determine actual limit
        uint256 actualLimit = limit > walletsCount ? walletsCount : limit;
        
        // Create temporary arrays to sort
        address[] memory tempAddresses = new address[](walletsCount);
        uint256[] memory tempPoints = new uint256[](walletsCount);
        
        // Copy data
        for (uint256 i = 0; i < walletsCount; i++) {
            tempAddresses[i] = wallets[i];
            tempPoints[i] = tPoints[wallets[i]];
        }
        
        // Quick sort (descending order by points) - more efficient than bubble sort
        quickSort(tempAddresses, tempPoints, 0, int256(walletsCount - 1));
        
        // Create result arrays with the limit
        addresses = new address[](actualLimit);
        points = new uint256[](actualLimit);
        
        for (uint256 i = 0; i < actualLimit; i++) {
            addresses[i] = tempAddresses[i];
            points[i] = tempPoints[i];
        }
        
        return (addresses, points);
    }

    /**
     * @dev Quick sort helper function for sorting leaderboard
     * @param addresses Array of addresses to sort
     * @param points Array of points to sort
     * @param left Left index
     * @param right Right index
     */
    function quickSort(address[] memory addresses, uint256[] memory points, int256 left, int256 right) internal pure {
        if (left >= right) return;

        int256 pivotIndex = partition(addresses, points, left, right);
        quickSort(addresses, points, left, pivotIndex - 1);
        quickSort(addresses, points, pivotIndex + 1, right);
    }

    /**
     * @dev Partition helper for quicksort
     */
    function partition(address[] memory addresses, uint256[] memory points, int256 left, int256 right) internal pure returns (int256) {
        uint256 pivot = points[uint256(right)];
        int256 i = left - 1;

        for (int256 j = left; j < right; j++) {
            if (points[uint256(j)] >= pivot) { // Descending order
                i++;
                // Swap addresses
                (addresses[uint256(i)], addresses[uint256(j)]) = (addresses[uint256(j)], addresses[uint256(i)]);
                // Swap points
                (points[uint256(i)], points[uint256(j)]) = (points[uint256(j)], points[uint256(i)]);
            }
        }

        // Swap with pivot
        (addresses[uint256(i + 1)], addresses[uint256(right)]) = (addresses[uint256(right)], addresses[uint256(i + 1)]);
        (points[uint256(i + 1)], points[uint256(right)]) = (points[uint256(right)], points[uint256(i + 1)]);

        return i + 1;
    }
    
    /**
     * @dev Get total number of wallets with points
     * @return The number of tracked wallets
     */
    function getTotalWallets() external view returns (uint256) {
        return wallets.length;
    }
    
    /**
     * @dev Transfer ownership to a new address
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }
}
