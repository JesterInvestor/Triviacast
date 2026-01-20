// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/**
 * @title TriviaPointsV2
 * @dev Manages T points with efficient quicksort for leaderboard queries
 */
contract TriviaPointsV2 {
    mapping(address => uint256) private tPoints;
    address[] private wallets;
    mapping(address => bool) private isWalletTracked;
    address public owner;
    
    event PointsAdded(address indexed wallet, uint256 amount, uint256 newTotal);
    event PointsUpdated(address indexed wallet, uint256 newTotal);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function addPoints(address wallet, uint256 amount) external {
        require(wallet != address(0), "Invalid wallet address");
        require(amount > 0, "Amount must be greater than zero");
        require(wallet == msg.sender, "Can only add points to your own wallet");
        
        if (!isWalletTracked[wallet]) {
            wallets.push(wallet);
            isWalletTracked[wallet] = true;
        }
        
        tPoints[wallet] += amount;
        emit PointsAdded(wallet, amount, tPoints[wallet]);
    }
    
    function getPoints(address wallet) external view returns (uint256) {
        return tPoints[wallet];
    }
    
    function updatePoints(address wallet, uint256 newTotal) external onlyOwner {
        require(wallet != address(0), "Invalid wallet address");
        
        if (!isWalletTracked[wallet] && newTotal > 0) {
            wallets.push(wallet);
            isWalletTracked[wallet] = true;
        }
        
        tPoints[wallet] = newTotal;
        emit PointsUpdated(wallet, newTotal);
    }
    
    function getLeaderboard(uint256 limit) external view returns (address[] memory addresses, uint256[] memory points) {
        uint256 walletsCount = wallets.length;
        if (walletsCount == 0) {
            return (new address[](0), new uint256[](0));
        }
        
        uint256 actualLimit = limit > walletsCount ? walletsCount : limit;
        
        address[] memory tempAddresses = new address[](walletsCount);
        uint256[] memory tempPoints = new uint256[](walletsCount);
        
        for (uint256 i = 0; i < walletsCount; i++) {
            tempAddresses[i] = wallets[i];
            tempPoints[i] = tPoints[wallets[i]];
        }
        
        quickSort(tempAddresses, tempPoints, 0, int256(walletsCount - 1));
        
        addresses = new address[](actualLimit);
        points = new uint256[](actualLimit);
        
        for (uint256 i = 0; i < actualLimit; i++) {
            addresses[i] = tempAddresses[i];
            points[i] = tempPoints[i];
        }
        
        return (addresses, points);
    }

    function quickSort(address[] memory addresses, uint256[] memory points, int256 left, int256 right) internal pure {
        if (left >= right) return;
        int256 pivotIndex = partition(addresses, points, left, right);
        quickSort(addresses, points, left, pivotIndex - 1);
        quickSort(addresses, points, pivotIndex + 1, right);
    }

    function partition(address[] memory addresses, uint256[] memory points, int256 left, int256 right) internal pure returns (int256) {
        uint256 pivot = points[uint256(right)];
        int256 i = left - 1;

        for (int256 j = left; j < right; j++) {
            if (points[uint256(j)] >= pivot) {
                i++;
                (addresses[uint256(i)], addresses[uint256(j)]) = (addresses[uint256(j)], addresses[uint256(i)]);
                (points[uint256(i)], points[uint256(j)]) = (points[uint256(j)], points[uint256(i)]);
            }
        }

        (addresses[uint256(i + 1)], addresses[uint256(right)]) = (addresses[uint256(right)], addresses[uint256(i + 1)]);
        (points[uint256(i + 1)], points[uint256(right)]) = (points[uint256(right)], points[uint256(i + 1)]);

        return i + 1;
    }
    
    function getTotalWallets() external view returns (uint256) {
        return wallets.length;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Migration helper: batch import from old contract
    function batchImport(address[] calldata _wallets, uint256[] calldata _points) external onlyOwner {
        require(_wallets.length == _points.length, "Length mismatch");
        for (uint256 i = 0; i < _wallets.length; i++) {
            address wallet = _wallets[i];
            uint256 points = _points[i];
            if (!isWalletTracked[wallet] && points > 0) {
                wallets.push(wallet);
                isWalletTracked[wallet] = true;
            }
            tPoints[wallet] = points;
            emit PointsUpdated(wallet, points);
        }
    }
}
