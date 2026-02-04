// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title ArcPaymentBase
 * @notice Arc上でのUSDC支払い処理のベーステンプレート
 * @dev このコントラクトを継承してカスタム支払いロジックを実装
 *
 * 主な機能:
 * - USDC支払い処理
 * - 手数料計算
 * - バッチ支払い
 * - 緊急停止
 *
 * Arc特有の考慮事項:
 * - ガストークンがUSDC（ETHではない）
 * - 決定論的ファイナリティ（確認待ち不要）
 * - ERC-20 USDCは6 decimals
 */
contract ArcPaymentBase is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    /// @notice Arc Testnet USDC address
    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    /// @notice 1 USDC in smallest unit (6 decimals)
    uint256 public constant ONE_USDC = 1e6;

    /// @notice Maximum fee in basis points (10%)
    uint256 public constant MAX_FEE_BPS = 1000;

    // ============ State Variables ============

    /// @notice Fee in basis points (100 = 1%)
    uint256 public feeBps;

    /// @notice Fee recipient address
    address public feeRecipient;

    /// @notice Total processed volume
    uint256 public totalVolume;

    /// @notice Total collected fees
    uint256 public totalFees;

    // ============ Events ============

    event PaymentProcessed(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        uint256 fee,
        bytes32 reference
    );

    event BatchPaymentProcessed(
        bytes32 indexed batchId,
        address indexed payer,
        uint256 totalAmount,
        uint256 recipientCount
    );

    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event FundsWithdrawn(address indexed token, address indexed to, uint256 amount);

    // ============ Errors ============

    error InvalidRecipient();
    error InvalidAmount();
    error InvalidFee();
    error ArrayLengthMismatch();
    error TransferFailed();

    // ============ Constructor ============

    /**
     * @notice Initialize the payment contract
     * @param _feeRecipient Address to receive fees
     * @param _feeBps Initial fee in basis points
     */
    constructor(address _feeRecipient, uint256 _feeBps) Ownable(msg.sender) {
        if (_feeRecipient == address(0)) revert InvalidRecipient();
        if (_feeBps > MAX_FEE_BPS) revert InvalidFee();

        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
    }

    // ============ External Functions ============

    /**
     * @notice Process a single USDC payment
     * @param recipient Payment recipient
     * @param amount Amount in USDC (6 decimals)
     * @param reference External reference ID
     * @return paymentId Unique payment identifier
     */
    function pay(
        address recipient,
        uint256 amount,
        bytes32 reference
    ) external nonReentrant whenNotPaused returns (bytes32 paymentId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();

        // Calculate fee
        uint256 fee = _calculateFee(amount);
        uint256 netAmount = amount - fee;

        // Generate payment ID
        paymentId = _generatePaymentId(msg.sender, recipient, amount, reference);

        // Transfer USDC
        USDC.safeTransferFrom(msg.sender, recipient, netAmount);
        if (fee > 0) {
            USDC.safeTransferFrom(msg.sender, feeRecipient, fee);
            totalFees += fee;
        }

        // Update stats
        totalVolume += amount;

        emit PaymentProcessed(paymentId, msg.sender, recipient, amount, fee, reference);
    }

    /**
     * @notice Process multiple payments in a single transaction
     * @param recipients Array of recipients
     * @param amounts Array of amounts
     * @param references Array of references
     * @return batchId Unique batch identifier
     */
    function batchPay(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes32[] calldata references
    ) external nonReentrant whenNotPaused returns (bytes32 batchId) {
        uint256 len = recipients.length;
        if (len != amounts.length || len != references.length) {
            revert ArrayLengthMismatch();
        }

        // Calculate total amount
        uint256 totalAmount = 0;
        uint256 totalFee = 0;
        for (uint256 i = 0; i < len; i++) {
            if (recipients[i] == address(0)) revert InvalidRecipient();
            if (amounts[i] == 0) revert InvalidAmount();
            totalAmount += amounts[i];
            totalFee += _calculateFee(amounts[i]);
        }

        // Generate batch ID
        batchId = keccak256(abi.encode(msg.sender, block.timestamp, recipients.length));

        // Transfer total USDC from sender
        USDC.safeTransferFrom(msg.sender, address(this), totalAmount);

        // Distribute to recipients
        for (uint256 i = 0; i < len; i++) {
            uint256 fee = _calculateFee(amounts[i]);
            uint256 netAmount = amounts[i] - fee;

            USDC.safeTransfer(recipients[i], netAmount);

            bytes32 paymentId = _generatePaymentId(msg.sender, recipients[i], amounts[i], references[i]);
            emit PaymentProcessed(paymentId, msg.sender, recipients[i], amounts[i], fee, references[i]);
        }

        // Transfer fees
        if (totalFee > 0) {
            USDC.safeTransfer(feeRecipient, totalFee);
            totalFees += totalFee;
        }

        totalVolume += totalAmount;

        emit BatchPaymentProcessed(batchId, msg.sender, totalAmount, len);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update fee rate
     * @param _feeBps New fee in basis points
     */
    function setFee(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert InvalidFee();
        emit FeeUpdated(feeBps, _feeBps);
        feeBps = _feeBps;
    }

    /**
     * @notice Update fee recipient
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == address(0)) revert InvalidRecipient();
        emit FeeRecipientUpdated(feeRecipient, _feeRecipient);
        feeRecipient = _feeRecipient;
    }

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
     * @param token Token address (use address(0) for native)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert InvalidRecipient();

        if (token == address(0)) {
            // Native token (USDC on Arc)
            (bool success, ) = to.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }

        emit FundsWithdrawn(token, to, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Calculate fee for a given amount
     * @param amount Amount in USDC
     * @return fee Fee amount in USDC
     */
    function calculateFee(uint256 amount) external view returns (uint256) {
        return _calculateFee(amount);
    }

    /**
     * @notice Get contract statistics
     * @return _totalVolume Total processed volume
     * @return _totalFees Total collected fees
     * @return _feeBps Current fee rate
     */
    function getStats() external view returns (
        uint256 _totalVolume,
        uint256 _totalFees,
        uint256 _feeBps
    ) {
        return (totalVolume, totalFees, feeBps);
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate fee for amount
     * @param amount Amount in USDC
     * @return fee Fee amount
     */
    function _calculateFee(uint256 amount) internal view returns (uint256) {
        return (amount * feeBps) / 10000;
    }

    /**
     * @notice Generate unique payment ID
     * @param payer Payer address
     * @param recipient Recipient address
     * @param amount Payment amount
     * @param reference External reference
     * @return paymentId Unique identifier
     */
    function _generatePaymentId(
        address payer,
        address recipient,
        uint256 amount,
        bytes32 reference
    ) internal view returns (bytes32) {
        return keccak256(abi.encode(payer, recipient, amount, block.timestamp, reference));
    }
}
