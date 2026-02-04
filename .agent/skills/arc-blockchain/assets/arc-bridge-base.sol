// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ArcBridgeBase
 * @notice CCTP統合のベーステンプレート
 * @dev ArcとのクロスチェーンUSDC転送を実装
 *
 * 主な機能:
 * - CCTP経由のUSDCブリッジ
 * - マルチチェーン対応
 * - イベントトラッキング
 *
 * 使用前の設定:
 * - TokenMessengerアドレスを設定
 * - MessageTransmitterアドレスを設定
 * - 各チェーンのUSDCアドレスを確認
 */

// ============ Interfaces ============

interface ITokenMessenger {
    /**
     * @notice Deposit USDC for burning and cross-chain transfer
     * @param amount Amount of USDC to burn
     * @param destinationDomain Domain ID of destination chain
     * @param mintRecipient Address on destination chain (bytes32 format)
     * @param burnToken Address of token to burn
     * @return nonce Unique nonce for this transfer
     */
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken
    ) external returns (uint64 nonce);

    /**
     * @notice Deposit USDC with caller specified
     */
    function depositForBurnWithCaller(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller
    ) external returns (uint64 nonce);
}

interface IMessageTransmitter {
    /**
     * @notice Receive a message from another chain
     * @param message The message bytes
     * @param attestation Circle attestation
     * @return success Whether the message was received
     */
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool success);
}

/**
 * @title ArcBridgeBase
 * @notice Base contract for CCTP-based USDC bridging
 */
contract ArcBridgeBase is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ CCTP Domains ============

    uint32 public constant DOMAIN_ETHEREUM = 0;
    uint32 public constant DOMAIN_AVALANCHE = 1;
    uint32 public constant DOMAIN_OPTIMISM = 2;
    uint32 public constant DOMAIN_ARBITRUM = 3;
    uint32 public constant DOMAIN_NOBLE = 4;
    uint32 public constant DOMAIN_SOLANA = 5;
    uint32 public constant DOMAIN_BASE = 6;
    uint32 public constant DOMAIN_ARC = 7;

    // ============ State Variables ============

    /// @notice CCTP TokenMessenger contract
    ITokenMessenger public immutable tokenMessenger;

    /// @notice CCTP MessageTransmitter contract
    IMessageTransmitter public immutable messageTransmitter;

    /// @notice USDC token contract
    IERC20 public immutable usdc;

    /// @notice Total bridged volume (outgoing)
    uint256 public totalBridgedOut;

    /// @notice Total bridged volume (incoming)
    uint256 public totalBridgedIn;

    /// @notice Mapping of nonce to bridge status
    mapping(uint64 => BridgeStatus) public bridgeStatuses;

    // ============ Structs ============

    struct BridgeStatus {
        address sender;
        address recipient;
        uint256 amount;
        uint32 destinationDomain;
        uint64 timestamp;
        bool completed;
    }

    // ============ Events ============

    event BridgeInitiated(
        uint64 indexed nonce,
        address indexed sender,
        bytes32 indexed mintRecipient,
        uint32 destinationDomain,
        uint256 amount
    );

    event BridgeReceived(
        bytes32 indexed messageHash,
        address indexed recipient,
        uint256 amount
    );

    // ============ Errors ============

    error InvalidRecipient();
    error InvalidAmount();
    error InvalidDomain();
    error BridgeFailed();

    // ============ Constructor ============

    /**
     * @notice Initialize the bridge contract
     * @param _tokenMessenger CCTP TokenMessenger address
     * @param _messageTransmitter CCTP MessageTransmitter address
     * @param _usdc USDC token address
     */
    constructor(
        address _tokenMessenger,
        address _messageTransmitter,
        address _usdc
    ) Ownable(msg.sender) {
        tokenMessenger = ITokenMessenger(_tokenMessenger);
        messageTransmitter = IMessageTransmitter(_messageTransmitter);
        usdc = IERC20(_usdc);
    }

    // ============ Bridge Functions ============

    /**
     * @notice Bridge USDC to another chain
     * @param destinationDomain Destination chain domain ID
     * @param recipient Recipient address on destination chain
     * @param amount Amount of USDC to bridge
     * @return nonce Unique nonce for this transfer
     */
    function bridge(
        uint32 destinationDomain,
        address recipient,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (uint64 nonce) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (!_isValidDomain(destinationDomain)) revert InvalidDomain();

        // Transfer USDC from sender
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Approve TokenMessenger
        usdc.approve(address(tokenMessenger), amount);

        // Convert recipient to bytes32
        bytes32 mintRecipient = _addressToBytes32(recipient);

        // Execute bridge
        nonce = tokenMessenger.depositForBurn(
            amount,
            destinationDomain,
            mintRecipient,
            address(usdc)
        );

        // Update state
        bridgeStatuses[nonce] = BridgeStatus({
            sender: msg.sender,
            recipient: recipient,
            amount: amount,
            destinationDomain: destinationDomain,
            timestamp: uint64(block.timestamp),
            completed: false
        });

        totalBridgedOut += amount;

        emit BridgeInitiated(nonce, msg.sender, mintRecipient, destinationDomain, amount);
    }

    /**
     * @notice Bridge USDC to Arc (convenience function)
     * @param recipient Recipient address on Arc
     * @param amount Amount of USDC to bridge
     * @return nonce Unique nonce for this transfer
     */
    function bridgeToArc(
        address recipient,
        uint256 amount
    ) external returns (uint64) {
        return this.bridge(DOMAIN_ARC, recipient, amount);
    }

    /**
     * @notice Bridge USDC to Ethereum (convenience function)
     * @param recipient Recipient address on Ethereum
     * @param amount Amount of USDC to bridge
     * @return nonce Unique nonce for this transfer
     */
    function bridgeToEthereum(
        address recipient,
        uint256 amount
    ) external returns (uint64) {
        return this.bridge(DOMAIN_ETHEREUM, recipient, amount);
    }

    /**
     * @notice Bridge USDC to Base (convenience function)
     * @param recipient Recipient address on Base
     * @param amount Amount of USDC to bridge
     * @return nonce Unique nonce for this transfer
     */
    function bridgeToBase(
        address recipient,
        uint256 amount
    ) external returns (uint64) {
        return this.bridge(DOMAIN_BASE, recipient, amount);
    }

    /**
     * @notice Bridge USDC to Arbitrum (convenience function)
     * @param recipient Recipient address on Arbitrum
     * @param amount Amount of USDC to bridge
     * @return nonce Unique nonce for this transfer
     */
    function bridgeToArbitrum(
        address recipient,
        uint256 amount
    ) external returns (uint64) {
        return this.bridge(DOMAIN_ARBITRUM, recipient, amount);
    }

    /**
     * @notice Receive bridged USDC (called on destination chain)
     * @param message The CCTP message
     * @param attestation Circle attestation signature
     * @return success Whether the receive was successful
     */
    function receiveBridge(
        bytes calldata message,
        bytes calldata attestation
    ) external nonReentrant whenNotPaused returns (bool success) {
        success = messageTransmitter.receiveMessage(message, attestation);
        if (!success) revert BridgeFailed();

        // Note: Amount and recipient are extracted from message by CCTP
        // This function is mainly for tracking

        bytes32 messageHash = keccak256(message);
        emit BridgeReceived(messageHash, address(0), 0);
    }

    // ============ View Functions ============

    /**
     * @notice Get bridge status by nonce
     * @param nonce Bridge nonce
     * @return status Bridge status details
     */
    function getBridgeStatus(uint64 nonce) external view returns (BridgeStatus memory) {
        return bridgeStatuses[nonce];
    }

    /**
     * @notice Get total bridge statistics
     * @return _totalBridgedOut Total outgoing volume
     * @return _totalBridgedIn Total incoming volume
     */
    function getBridgeStats() external view returns (
        uint256 _totalBridgedOut,
        uint256 _totalBridgedIn
    ) {
        return (totalBridgedOut, totalBridgedIn);
    }

    /**
     * @notice Get domain name by ID
     * @param domainId Domain ID
     * @return name Domain name
     */
    function getDomainName(uint32 domainId) external pure returns (string memory) {
        if (domainId == DOMAIN_ETHEREUM) return "Ethereum";
        if (domainId == DOMAIN_AVALANCHE) return "Avalanche";
        if (domainId == DOMAIN_OPTIMISM) return "Optimism";
        if (domainId == DOMAIN_ARBITRUM) return "Arbitrum";
        if (domainId == DOMAIN_NOBLE) return "Noble";
        if (domainId == DOMAIN_SOLANA) return "Solana";
        if (domainId == DOMAIN_BASE) return "Base";
        if (domainId == DOMAIN_ARC) return "Arc";
        return "Unknown";
    }

    // ============ Admin Functions ============

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency withdraw stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert InvalidRecipient();
        IERC20(token).safeTransfer(to, amount);
    }

    // ============ Internal Functions ============

    /**
     * @notice Convert address to bytes32
     * @param addr Address to convert
     * @return Bytes32 representation
     */
    function _addressToBytes32(address addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }

    /**
     * @notice Convert bytes32 to address
     * @param b Bytes32 to convert
     * @return Address representation
     */
    function _bytes32ToAddress(bytes32 b) internal pure returns (address) {
        return address(uint160(uint256(b)));
    }

    /**
     * @notice Check if domain is valid
     * @param domainId Domain ID to check
     * @return isValid Whether domain is valid
     */
    function _isValidDomain(uint32 domainId) internal pure returns (bool) {
        return domainId <= DOMAIN_ARC;
    }
}
