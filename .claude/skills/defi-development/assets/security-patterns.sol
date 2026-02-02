// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeFi Security Patterns
 * @notice DeFiプロトコルで使用される主要なセキュリティパターン集
 * @dev 参照用の実装例。プロダクションでは適切にカスタマイズすること
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN 1: CEI (Checks-Effects-Interactions)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title CEIPattern
 * @notice Checks-Effects-Interactions パターンの実装例
 */
contract CEIPattern {
    using SafeERC20 for IERC20;

    mapping(address => uint256) public balances;

    // BAD: 脆弱な実装（リエントランシー攻撃可能）
    function withdrawBad(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient");

        // Interaction before Effect - 危険!
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);

        balances[msg.sender] -= amount;  // Effect after Interaction
    }

    // GOOD: CEIパターンを適用
    function withdrawGood(uint256 amount) external {
        // Checks
        require(balances[msg.sender] >= amount, "Insufficient");

        // Effects（状態変更を先に）
        balances[msg.sender] -= amount;

        // Interactions（外部呼び出しを最後に）
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN 2: Pull Over Push
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title PullOverPushPattern
 * @notice Pull-over-Push パターン（ユーザーが自分で引き出す）
 */
contract PullOverPushPattern {
    mapping(address => uint256) public pendingWithdrawals;

    // BAD: Push（プロトコルが送信）
    function distributeBad(address[] calldata recipients, uint256[] calldata amounts) external {
        for (uint256 i = 0; i < recipients.length; i++) {
            // 一つでも失敗すると全体が失敗
            payable(recipients[i]).transfer(amounts[i]);
        }
    }

    // GOOD: Pull（ユーザーが引き出し）
    function distributeGood(address[] calldata recipients, uint256[] calldata amounts) external {
        for (uint256 i = 0; i < recipients.length; i++) {
            pendingWithdrawals[recipients[i]] += amounts[i];
        }
    }

    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN 3: Slippage Protection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title SlippageProtection
 * @notice スリッページ保護の実装例
 */
contract SlippageProtection {
    error DeadlineExpired();
    error SlippageExceeded();

    // BAD: スリッページ保護なし
    function swapBad(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // サンドイッチ攻撃に脆弱
        amountOut = _executeSwap(tokenIn, tokenOut, amountIn);
    }

    // GOOD: スリッページ保護あり
    function swapGood(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,    // 最小受取量
        uint256 deadline          // 有効期限
    ) external returns (uint256 amountOut) {
        // デッドラインチェック
        if (block.timestamp > deadline) revert DeadlineExpired();

        amountOut = _executeSwap(tokenIn, tokenOut, amountIn);

        // スリッページチェック
        if (amountOut < amountOutMin) revert SlippageExceeded();
    }

    function _executeSwap(address, address, uint256 amountIn) internal pure returns (uint256) {
        // 実際のスワップロジック
        return amountIn;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN 4: Flash Loan Protection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title FlashLoanProtection
 * @notice フラッシュローン攻撃対策
 */
contract FlashLoanProtection {
    mapping(address => uint256) public lastInteractionBlock;

    error SameBlockInteraction();

    // ブロック跨ぎチェック
    modifier noSameBlockInteraction() {
        if (block.number == lastInteractionBlock[msg.sender]) {
            revert SameBlockInteraction();
        }
        lastInteractionBlock[msg.sender] = block.number;
        _;
    }

    // 価格操作に敏感な操作に適用
    function sensitiveOperation() external noSameBlockInteraction {
        // フラッシュローンによる即時操作を防止
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN 5: Oracle Safety
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title OracleSafety
 * @notice オラクルデータの安全な使用
 */
interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract OracleSafety {
    error InvalidPrice();
    error StalePrice();
    error PriceDeviationTooHigh();

    uint256 public constant MAX_STALENESS = 1 hours;
    uint256 public constant MAX_DEVIATION = 500; // 5%

    int256 public lastValidPrice;

    // BAD: チェックなしで価格を使用
    function getPriceBad(address feed) external view returns (int256) {
        (, int256 price, , , ) = AggregatorV3Interface(feed).latestRoundData();
        return price;  // 検証なし - 危険!
    }

    // GOOD: 完全な検証
    function getPriceGood(address feed) external returns (int256) {
        (
            uint80 roundId,
            int256 price,
            ,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = AggregatorV3Interface(feed).latestRoundData();

        // 基本的な妥当性チェック
        if (price <= 0) revert InvalidPrice();
        if (answeredInRound < roundId) revert StalePrice();
        if (block.timestamp - updatedAt > MAX_STALENESS) revert StalePrice();

        // 急激な価格変動チェック
        if (lastValidPrice > 0) {
            uint256 deviation = _calculateDeviation(lastValidPrice, price);
            if (deviation > MAX_DEVIATION) revert PriceDeviationTooHigh();
        }

        lastValidPrice = price;
        return price;
    }

    function _calculateDeviation(int256 oldPrice, int256 newPrice) internal pure returns (uint256) {
        int256 diff = oldPrice > newPrice ? oldPrice - newPrice : newPrice - oldPrice;
        return uint256(diff * 10000 / oldPrice);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN 6: ERC4626 Inflation Attack Protection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title InflationAttackProtection
 * @notice ERC4626インフレ攻撃対策
 */
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract SecureVault is ERC4626 {
    // 方法1: デッドシェア
    constructor(
        IERC20 asset_
    ) ERC4626(asset_) ERC20("Secure Vault", "sVLT") {
        // デッドシェアを作成して攻撃を無効化
        _mint(address(0xdead), 10 ** decimals());
    }
}

// 方法2: 仮想オフセット
contract VirtualOffsetVault is ERC4626 {
    uint256 private constant VIRTUAL_SHARES = 1e18;
    uint256 private constant VIRTUAL_ASSETS = 1e18;

    constructor(
        IERC20 asset_
    ) ERC4626(asset_) ERC20("Virtual Offset Vault", "voVLT") {}

    function totalAssets() public view virtual override returns (uint256) {
        return super.totalAssets() + VIRTUAL_ASSETS;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return super.totalSupply() + VIRTUAL_SHARES;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN 7: Signature Replay Protection
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title SignatureReplayProtection
 * @notice 署名リプレイ攻撃対策
 */
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract SignatureReplayProtection is EIP712 {
    using ECDSA for bytes32;

    mapping(address => uint256) public nonces;

    bytes32 private constant EXECUTE_TYPEHASH =
        keccak256("Execute(address to,uint256 value,bytes data,uint256 nonce,uint256 deadline)");

    error InvalidSignature();
    error ExpiredSignature();

    constructor() EIP712("SignatureProtection", "1") {}

    // BAD: リプレイ可能
    function executeBad(
        address to,
        uint256 value,
        bytes calldata data,
        bytes memory signature
    ) external {
        bytes32 hash = keccak256(abi.encode(to, value, data));
        address signer = hash.toEthSignedMessageHash().recover(signature);
        // 同じ署名を何度でも使用可能 - 危険!
        (bool success, ) = to.call{value: value}(data);
        require(success);
    }

    // GOOD: nonce + deadline + chainId
    function executeGood(
        address to,
        uint256 value,
        bytes calldata data,
        uint256 deadline,
        bytes memory signature
    ) external {
        if (block.timestamp > deadline) revert ExpiredSignature();

        bytes32 structHash = keccak256(
            abi.encode(
                EXECUTE_TYPEHASH,
                to,
                value,
                keccak256(data),
                nonces[msg.sender]++,
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);

        if (signer != msg.sender) revert InvalidSignature();

        (bool success, ) = to.call{value: value}(data);
        require(success);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN 8: Circuit Breaker
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title CircuitBreaker
 * @notice サーキットブレーカーパターン
 */
contract CircuitBreaker {
    uint256 public constant MAX_DAILY_OUTFLOW = 1000 ether;
    uint256 public constant CIRCUIT_BREAKER_COOLDOWN = 24 hours;

    uint256 public dailyOutflow;
    uint256 public lastResetTimestamp;
    bool public circuitBreakerTriggered;
    uint256 public circuitBreakerTriggeredAt;

    error DailyLimitExceeded();
    error CircuitBreakerActive();

    event CircuitBreakerTriggered(uint256 timestamp);
    event CircuitBreakerReset(uint256 timestamp);

    modifier withinDailyLimit(uint256 amount) {
        _updateDailyOutflow();

        if (circuitBreakerTriggered) {
            if (block.timestamp < circuitBreakerTriggeredAt + CIRCUIT_BREAKER_COOLDOWN) {
                revert CircuitBreakerActive();
            }
            // クールダウン期間経過後、自動リセット
            circuitBreakerTriggered = false;
            emit CircuitBreakerReset(block.timestamp);
        }

        if (dailyOutflow + amount > MAX_DAILY_OUTFLOW) {
            circuitBreakerTriggered = true;
            circuitBreakerTriggeredAt = block.timestamp;
            emit CircuitBreakerTriggered(block.timestamp);
            revert DailyLimitExceeded();
        }

        dailyOutflow += amount;
        _;
    }

    function _updateDailyOutflow() internal {
        if (block.timestamp >= lastResetTimestamp + 1 days) {
            dailyOutflow = 0;
            lastResetTimestamp = block.timestamp;
        }
    }

    function withdraw(uint256 amount) external withinDailyLimit(amount) {
        // 引き出しロジック
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN 9: Two-Step Ownership Transfer
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title TwoStepOwnership
 * @notice 2段階オーナーシップ移転
 */
contract TwoStepOwnership {
    address public owner;
    address public pendingOwner;

    error NotOwner();
    error NotPendingOwner();

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // BAD: 1段階移転（タイポで資金ロストのリスク）
    function transferOwnershipBad(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // GOOD: 2段階移転
    function transferOwnership(address newOwner) external onlyOwner {
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();

        emit OwnershipTransferred(owner, pendingOwner);
        owner = pendingOwner;
        pendingOwner = address(0);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATTERN 10: Internal Accounting
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @title InternalAccounting
 * @notice 内部会計パターン（ドネーション攻撃対策）
 */
contract InternalAccounting {
    using SafeERC20 for IERC20;

    mapping(address => mapping(address => uint256)) private _balances;
    mapping(address => uint256) private _totalDeposits;

    // BAD: 外部残高に依存
    function totalAssetsBad(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));  // 直接送金で操作可能
    }

    // GOOD: 内部会計を使用
    function totalAssetsGood(address token) external view returns (uint256) {
        return _totalDeposits[token];  // 直接送金では変わらない
    }

    function deposit(address token, uint256 amount) external {
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 actualReceived = IERC20(token).balanceOf(address(this)) - balanceBefore;

        _balances[msg.sender][token] += actualReceived;
        _totalDeposits[token] += actualReceived;
    }

    function withdraw(address token, uint256 amount) external {
        require(_balances[msg.sender][token] >= amount, "Insufficient");

        _balances[msg.sender][token] -= amount;
        _totalDeposits[token] -= amount;

        IERC20(token).safeTransfer(msg.sender, amount);
    }
}
