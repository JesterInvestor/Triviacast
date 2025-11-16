// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {InvalidInput, TokensTransferError} from "./common/error.sol";
import {Ownable} from "./common/Ownable.sol";
import {IBETRStakingEventHandler} from "./interfaces/IBETRStakingEventHandler.sol";
import {IBETRStakingStateProvider} from "./interfaces/IBETRStakingStateProvider.sol";

/*
 * @title BETRStaking
 * @author Mirko Nosenzo (@netnose)
 * @notice This contract is used to stake an ERC20 token
 */
contract BETRStaking is IBETRStakingStateProvider, Ownable {
    IERC20 public immutable stakingToken;
    uint256 public totalStakedAmount;
    mapping(address => uint256) public stakedAmount;
    bool public isStakingPaused;

    IBETRStakingEventHandler[] public rewarders;

    /*
     * @notice Constructor
     * @param _owner The owner of the contract
     * @param _stakingToken The ERC20 token to stake
     */
    constructor(address _owner, address _stakingToken) Ownable(_owner) {
        if (_stakingToken == address(0)) revert InvalidInput();
        
        stakingToken = IERC20(_stakingToken);
        isStakingPaused = false;
    }

    /*
     * @title NotEnoughStakedAmount
     * @notice Error to check if the staked amount is less than the amount to unstake
     * @param available The available amount
     * @param requested The requested amount
     */
    error NotEnoughStakedAmount(uint256 available, uint256 requested);

    /*
     * @title StakingPaused
     * @notice Error to check if the staking is paused
     */
    error StakingPaused();

    /*
     * @title RewarderAdded
     * @notice Event to notify when a rewarder is added
     * @param rewarder The address of the rewarder
     */
    event RewarderAdded(address indexed rewarder);

    /*
     * @title RewarderRemoved
     * @notice Event to notify when a rewarder is removed
     * @param rewarder The address of the rewarder
     */
    event RewarderRemoved(address indexed rewarder);

    /*
     * @title Staked
     * @notice Event to notify when an address has staked
     * @param staker The address that staked
     * @param amount The amount of tokens staked
     */
    event Staked(address indexed staker, uint256 indexed amount);

    /*
     * @title Unstaked
     * @notice Event to notify when an address has unstaked
     * @param staker The address that unstaked
     * @param amount The amount of tokens unstaked
     */
    event Unstaked(address indexed staker, uint256 indexed amount);

    /*
     * @title StakingPausedSet
     * @notice Event to notify when the staking paused state is set
     * @param isStakingPaused The new staking paused state
     */
    event StakingPausedSet(bool indexed isStakingPaused);

    /*
     * @title _unstake
     * @notice Internal function to unstake tokens for a user
     * @param _user The user to unstake tokens for
     * @param _amount The amount to unstake (0 for all)
     * @return The amount actually unstaked
     */
    function _unstake(address _user, uint256 _amount) internal returns (uint256) {
        if (_user == address(0)) revert InvalidInput();
        
        uint256 userStaked = stakedAmount[_user];
        uint256 amountToUnstake = _amount == 0 ? userStaked : _amount;
        if (amountToUnstake == 0) return 0;

        if (amountToUnstake > userStaked) {
            revert NotEnoughStakedAmount(userStaked, amountToUnstake);
        }
        
        uint256 oldStakedAmount = stakedAmount[_user];
        stakedAmount[_user] -= amountToUnstake;
        uint256 newStakedAmount = stakedAmount[_user];
        for (uint256 i = 0; i < rewarders.length; i++) {
            rewarders[i].onStakeChanged(_user, oldStakedAmount, newStakedAmount);
        }

        try stakingToken.transfer(_user, amountToUnstake) returns (bool success) {
            if (!success) revert TokensTransferError();
        } catch {
            revert TokensTransferError();
        }

        emit Unstaked(_user, amountToUnstake);
        
        return amountToUnstake;
    }

    /*
     * @title stake
     * @notice Stake an ERC20 token
     * @param _amount The amount of ERC20 tokens to stake
     */
    function stake(uint256 _amount) public {
        if (isStakingPaused) revert StakingPaused();
        if (_amount == 0) revert InvalidInput();

        uint256 oldStakedAmount = stakedAmount[msg.sender];
        stakedAmount[msg.sender] += _amount;
        totalStakedAmount += _amount;
        uint256 newStakedAmount = stakedAmount[msg.sender];
        for (uint256 i = 0; i < rewarders.length; i++) {
            rewarders[i].onStakeChanged(msg.sender, oldStakedAmount, newStakedAmount);
        }

        try stakingToken.transferFrom(msg.sender, address(this), _amount) returns (bool success) {
            if (!success) revert TokensTransferError();
        } catch {
            revert TokensTransferError();
        }

        emit Staked(msg.sender, _amount);
    }

    /*
     * @title stakeFor
     * @notice Function to stake tokens for a user
     * @param _user The user to stake tokens for
     * @param _amount The amount of tokens to stake
     */
    function stakeFor(address _user, uint256 _amount) public {
        if (isStakingPaused) revert StakingPaused();
        if (_user == address(0)) revert InvalidInput();
        if (_amount == 0) revert InvalidInput();
        
        uint256 oldStakedAmount = stakedAmount[_user];
        stakedAmount[_user] += _amount;
        totalStakedAmount += _amount;
        uint256 newStakedAmount = stakedAmount[_user];
        for (uint256 i = 0; i < rewarders.length; i++) {
            rewarders[i].onStakeChanged(_user, oldStakedAmount, newStakedAmount);
        }

        try stakingToken.transferFrom(msg.sender, address(this), _amount) returns (bool success) {
            if (!success) revert TokensTransferError();
        } catch {
            revert TokensTransferError();
        }

        emit Staked(_user, _amount);
    }

    /*
     * @title unstake
     * @notice Unstake an ERC20 token
     * @param _amount The amount of ERC20 tokens to unstake
     */
    function unstake(uint256 _amount) public {
        if (isStakingPaused) revert StakingPaused();
        if (_amount == 0) revert InvalidInput();
        
        uint256 unstakedAmount = _unstake(msg.sender, _amount);
        totalStakedAmount -= unstakedAmount;
    }

    /*
     * @title batchUnstake
     * @notice Admin function to unstake tokens for multiple users (owner only)
     * @param _users Array of users to unstake tokens for
     * @param _amounts Array of amounts to unstake (0 for all, must match _users length)
     * @dev This function bypasses the staking pause for emergency situations
     */
    function batchUnstake(address[] calldata _users, uint256[] calldata _amounts) public onlyOwner {
        if (_users.length != _amounts.length) revert InvalidInput();
        if (_users.length == 0) revert InvalidInput();
        
        uint256 totalUnstaked = 0;
        
        for (uint256 i = 0; i < _users.length; i++) {
            address user = _users[i];
            uint256 amount = _amounts[i];
            
            uint256 unstakedAmount = _unstake(user, amount);
            totalUnstaked += unstakedAmount;
        }
        
        totalStakedAmount -= totalUnstaked;
    }

    /*
     * @title setStakingPaused
     * @notice Function to set the staking paused state
     * @param _isStakingPaused The new staking paused state
     */
    function setStakingPaused(bool _isStakingPaused) public onlyOwner {
        isStakingPaused = _isStakingPaused;
        emit StakingPausedSet(_isStakingPaused);
    }

    /*
     * @title isRewarder
     * @notice Function to check if an address is a rewarder
     * @param _rewarder The address of the rewarder
     * @return True if the address is a rewarder, false otherwise
     */
    function isRewarder(address _rewarder) public view returns (bool) {
        for (uint256 i = 0; i < rewarders.length; i++) {
            if (address(rewarders[i]) == _rewarder) {
                return true;
            }
        }
        return false;
    }

    /*
     * @title addRewarder
     * @notice Function to add a rewarder
     * @param _rewarder The address of the rewarder
     */
    function addRewarder(address _rewarder) public onlyOwner {
        if (_rewarder == address(0)) revert InvalidInput();
        if (isRewarder(_rewarder)) revert InvalidInput();
        rewarders.push(IBETRStakingEventHandler(_rewarder));
        emit RewarderAdded(_rewarder);
    }

    /*
     * @title removeRewarder
     * @notice Function to remove a rewarder
     * @param _rewarder The address of the rewarder
     */
    function removeRewarder(address _rewarder) public onlyOwner {
        for (uint256 i = 0; i < rewarders.length; i++) {
            if (address(rewarders[i]) == _rewarder) {
                rewarders[i] = rewarders[rewarders.length - 1];
                rewarders.pop();
                emit RewarderRemoved(_rewarder);
                return;
            }
        }
    }
}

// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "./common/Ownable.sol";
import {IBETRStakingEventHandler} from "./interfaces/IBETRStakingEventHandler.sol";
import {IBETRStakingStateProvider} from "./interfaces/IBETRStakingStateProvider.sol";
import {InvalidInput, TokensTransferError} from "./common/error.sol";

/*
 * @title BETRRewards
 * @author Mirko Nosenzo (@netnose)
 * @notice This contract is used to manage rewards for the staking contract
 */
contract BETRRewards is IBETRStakingEventHandler, Ownable {
    mapping(address => uint256) private _debts;
    mapping(address => uint256) private _credits;

    uint256 public constant PRECISION = 1e18;

    IBETRStakingStateProvider public stakingContract;
    IERC20 public rewardToken;
    uint256 public rewardAccumulatedPerStakedToken;
    uint256 public totalRewardsClaimed;
    uint256 public totalRewardsClaimable;
    bool public isRewardingPaused;

    /*
     * @notice Constructor
     * @param _owner The owner of the contract
     * @param _stakingContract The address of the staking contract
     * @param _rewardToken The address of the reward token
     */
    constructor(address _owner, address _stakingContract, address _rewardToken) Ownable(_owner) {
        if (_stakingContract == address(0)) revert InvalidInput();
        if (_rewardToken == address(0)) revert InvalidInput();

        stakingContract = IBETRStakingStateProvider(_stakingContract);
        rewardToken = IERC20(_rewardToken);
    }

    /*
     * @title RewardingPaused
     * @notice Error to check if the rewarding is paused
     */
    error RewardingPaused();

    /*
     * @title NoClaimableReward
     * @notice Error to check if there is no claimable reward
     * @param _staker The address of the staker
     */
    error NoClaimableReward(address _staker);

    /*
     * @title NoStakedAmount
     * @notice Error to check if there is no staked amount
     */
    error NoStakedAmount();

    /*
     * @title NotStakingContract
     * @notice Error to check if the caller is not the staking contract
     */
    error NotStakingContract();

    /*
     * @title StakingContractNotRewarder
     * @notice Error to check if the caller is not a rewarder
     */
    error StakingContractNotRewarder();

    /*
     * @title RewardingPausedSet
     * @notice Event to notify when the rewarding is paused
     * @param _isRewardingPaused The new rewarding paused state
     */
    event RewardingPausedSet(bool indexed _isRewardingPaused);

    /*
     * @title RewardAdded
     * @notice Event to notify when a reward is added
     * @param _amount The amount of the reward
     */
    event RewardAdded(uint256 _amount);

    /*
     * @title RewardClaimed
     * @notice Event to notify when a reward is claimed
     * @param _staker The address of the staker
     * @param _amount The amount of the reward
     */
    event RewardClaimed(address indexed _staker, uint256 _amount);

    /*
     * @title onlyStakingContract
     * @notice Modifier to check if the caller is the staking contract
     */
    modifier onlyStakingContract() {
        if (msg.sender != address(stakingContract)) revert NotStakingContract();
        _;
    }

    /*
     * @title _claim
     * @notice Function to claim a reward
     * @param _user The address of the user
     */
    function _claim(address _user, uint256 _stakedAmount) internal {
        if (_user == address(0)) revert InvalidInput();

        uint256 rewardAmount = rewardAccumulatedPerStakedToken * _stakedAmount / PRECISION;
        uint256 actualRewardAmount = rewardAmount - _debts[_user] + _credits[_user];
        if (actualRewardAmount == 0) revert NoClaimableReward(_user);

        _debts[_user] = rewardAmount;
        _credits[_user] = 0;
        totalRewardsClaimed += actualRewardAmount;
        totalRewardsClaimable -= actualRewardAmount;

        try rewardToken.transfer(_user, actualRewardAmount) returns (bool success) {
            if (!success) revert TokensTransferError();
        } catch {
            revert TokensTransferError();
        }
        
        emit RewardClaimed(_user, actualRewardAmount);
    }

    /*
     * @title claimable
     * @notice Function to get the claimable rewards for a staker
     * @param _staker The address of the staker
     * @return _amount The amount of the claimable rewards
     */
    function claimable(address _staker) public view returns (uint256 _amount) {
        uint256 rewardAmount = rewardAccumulatedPerStakedToken * stakingContract.stakedAmount(_staker) / PRECISION;
        uint256 actualRewardAmount = rewardAmount - _debts[_staker] + _credits[_staker];
        return actualRewardAmount;
    }

    /*
     * @title claimable
     * @notice Function to get the claimable rewards for the caller
     * @return _amount The amount of the claimable rewards
     */
    function claimable() public view returns (uint256 _amount) {
        return claimable(msg.sender);
    }

    /*
     * @title addReward
     * @notice Function to add a reward
     * @param _amount The amount of the reward
     */
    function addReward(uint256 _amount) public {
        if (isRewardingPaused) revert RewardingPaused();
        if (_amount == 0) revert InvalidInput();
        if (!stakingContract.isRewarder(address(this))) revert StakingContractNotRewarder();

        uint256 totalStakedAmount = stakingContract.totalStakedAmount();
        if (totalStakedAmount == 0) revert NoStakedAmount();

        rewardAccumulatedPerStakedToken += (_amount * PRECISION) / totalStakedAmount;
        totalRewardsClaimable += _amount;

        try rewardToken.transferFrom(msg.sender, address(this), _amount) returns (bool success) {
            if (!success) revert TokensTransferError();
        } catch {
            revert TokensTransferError();
        }

        emit RewardAdded(_amount);
    }

    /*
     * @title claim
     * @notice Function to claim a reward
     */
    function claim() public {
        if (isRewardingPaused) revert RewardingPaused();
        _claim(msg.sender, stakingContract.stakedAmount(msg.sender));
    }

    /*
     * @title batchClaim
     * @notice Admin function to claim all rewards for multiple users (owner only)
     * @param _users Array of addresses of the users to claim rewards for
     * @dev This function bypasses the rewarding pause for emergency situations
     */
    function batchClaim(address[] memory _users) public onlyOwner {
        for (uint256 i = 0; i < _users.length; i++) {
            _claim(_users[i], stakingContract.stakedAmount(_users[i]));
        }
    }

    /*
     * @title setStakingPaused
     * @notice Function to set the staking paused state
     * @param _isRewardingPaused The new rewarding paused state
     */
    function setRewardingPaused(bool _isRewardingPaused) public onlyOwner {
        isRewardingPaused = _isRewardingPaused;
        emit RewardingPausedSet(_isRewardingPaused);
    }

    /*
     * @title onStakeChanged
     * @notice Function to handle the stake changed event
     * @param _user The address of the user
     * @param _oldAmount The old amount of the stake
     * @param _newAmount The new amount of the stake
     */
    function onStakeChanged(address _user, uint256 _oldAmount, uint256 _newAmount) public onlyStakingContract {
        if (_user == address(0)) revert InvalidInput();
        if (_oldAmount == _newAmount) return;

        uint256 rewardAmount = rewardAccumulatedPerStakedToken * _oldAmount / PRECISION;
        uint256 actualRewardAmount = rewardAmount - _debts[_user] + _credits[_user];
        _credits[_user] = actualRewardAmount;
        _debts[_user] = rewardAccumulatedPerStakedToken * _newAmount / PRECISION;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * @title InvalidInput
 * @notice Error to check if the input is invalid
 */
error InvalidInput();

/*
 * @title TokensTransferError
 * @notice Error to check if the transfer of tokens fails
 */
error TokensTransferError();

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {InvalidInput} from "./error.sol";

/*
 * @title Ownable
 * @author Mirko Nosenzo (@netnose)
 * @notice This contract is used to manage the ownership of the contract
 */
abstract contract Ownable {
    address public owner;
    address public proposedOwner;

    /*
     * @notice Constructor
     * @param _owner The owner of the contract
     */
    constructor(address _owner) {
        if (_owner == address(0)) revert InvalidInput();
        owner = _owner;
    }

    /*
    * @title NotOwner
    * @notice Error to check if the caller is the owner
    */
    error NotOwner();

    /*
    * @title NotProposedOwner
    * @notice Error to check if the caller is the proposed owner
    */
    error NotProposedOwner();

    /*
     * @title OwnershipTransferred
     * @notice Event to notify when ownership is transferred
     * @param previousOwner The previous owner
     * @param newOwner The new owner
     */
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /*
     * @title onlyOwner
     * @notice Modifier to check if the caller is the owner
     */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /*
     * @title onlyProposedOwner
     * @notice Modifier to check if the caller is the proposed owner
     */
    modifier onlyProposedOwner() {
        if (msg.sender != proposedOwner) revert NotProposedOwner();
        _;
    }

    /*
     * @title setProposedOwner
     * @notice Function to set the proposed owner
     * @param _proposedOwner The proposed owner
     */
    function setProposedOwner(address _proposedOwner) public onlyOwner {
        if (_proposedOwner == address(0)) revert InvalidInput();
        proposedOwner = _proposedOwner;
    }

    /*
     * @title acceptOwnership
     * @notice Function to accept the ownership
     */
    function acceptOwnership() public onlyProposedOwner {
        emit OwnershipTransferred(owner, proposedOwner);
        owner = proposedOwner;
        proposedOwner = address(0);
    }

    /*
     * @title cancelProposedOwnership
     * @notice Function to cancel the proposed ownership
     */
    function cancelProposedOwnership() public onlyOwner {
        proposedOwner = address(0);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/*
 * @title IBETRStakingEventHandler
 * @notice Interface for the staking event handler
 */
interface IBETRStakingEventHandler {
    /*
     * @title onStakeChanged
     * @notice Function to handle the stake changed event
     * @param _user The user who changed the stake
     * @param _oldAmount The old amount of stake
     * @param _newAmount The new amount of stake
     */
    function onStakeChanged(address _user, uint256 _oldAmount, uint256 _newAmount) external;
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/*
 * @title IBETRStakingStateProvider
 * @notice Interface for the staking state provider
 */
interface IBETRStakingStateProvider {
    /*
     * @title isRewarder
     * @notice Function to check if an address is a rewarder
     * @param _contract The address to check
     * @return isRewarder True if the address is a rewarder, false otherwise
     */
    function isRewarder(address _contract) external view returns (bool);

    /*
     * @title stakingToken
     * @notice Function to get the staking token
     * @return stakingToken The staking token
     */
    function stakingToken() external view returns (IERC20);
    
    /*
     * @title totalStakedAmount
     * @notice Function to get the total amount of tokens staked
     * @return totalStakedAmount The total amount of tokens staked
     */
    function totalStakedAmount() external view returns (uint256);

    /*
     * @title stakedAmount
     * @notice Function to get the amount of tokens staked by a user
     * @param _user The address of the user
     * @return stakedAmount The amount of tokens staked by the user
     */
    function stakedAmount(address _user) external view returns (uint256);
}

