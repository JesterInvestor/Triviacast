// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title JackpotClaim
 * @notice Accepts EIP-712 signed claims and transfers ERC20 TRIV to recipients.
 * The server signer issues a typed signature for (recipient, amount, nonce, expiry).
 */
contract JackpotClaim is EIP712, Ownable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public signer;

    // track used nonces per recipient via keccak(recipient, nonce)
    mapping(bytes32 => bool) public used;

    // keccak256("Claim(address recipient,uint256 amount,uint256 nonce,uint256 expiry)")
    bytes32 public constant CLAIM_TYPEHASH = keccak256("Claim(address recipient,uint256 amount,uint256 nonce,uint256 expiry)");

    event Claimed(address indexed recipient, uint256 amount, uint256 nonce, uint256 expiry, address indexed signer);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);

    constructor(address token_, address signer_) EIP712("Triviacast Jackpot", "1") Ownable(msg.sender) {
        require(token_ != address(0), "token 0");
        require(signer_ != address(0), "signer 0");
        token = IERC20(token_);
        signer = signer_;
    }

    /**
     * @notice Claim TRIV using an EIP-712 signature issued by the server signer.
     * @param recipient the address receiving tokens
     * @param amount token amount in atomic units (wei)
     * @param nonce a unique nonce for this claim (server-supplied)
     * @param expiry unix timestamp when signature expires
     * @param signature the EIP-712 signature over the claim fields
     */
    function claim(address recipient, uint256 amount, uint256 nonce, uint256 expiry, bytes calldata signature) external {
        require(block.timestamp <= expiry, "signature expired");
        require(recipient != address(0), "invalid recipient");
        require(amount > 0, "amount 0");

        bytes32 structHash = keccak256(abi.encode(CLAIM_TYPEHASH, recipient, amount, nonce, expiry));
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == signer, "invalid signature");

        bytes32 key = keccak256(abi.encodePacked(recipient, nonce));
        require(!used[key], "nonce used");
        used[key] = true;

        token.safeTransfer(recipient, amount);

        emit Claimed(recipient, amount, nonce, expiry, recovered);
    }

    function updateSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "signer 0");
        address old = signer;
        signer = newSigner;
        emit SignerUpdated(old, newSigner);
    }

    function isUsed(address recipient, uint256 nonce) external view returns (bool) {
        return used[keccak256(abi.encodePacked(recipient, nonce))];
    }
}
