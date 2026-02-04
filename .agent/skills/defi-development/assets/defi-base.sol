// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeFi Base Template
 * @notice DeFiプロトコル開発のベーステンプレート
 * @dev セキュリティベストプラクティスを組み込んだ基本構造
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DeFiBase
 * @notice 安全なDeFiプロトコルの基本実装
 */
abstract contract DeFiBase is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════════════════════════════════════

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    event Deposit(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, address indexed token, uint256 amount);
    event EmergencyWithdraw(address indexed user, address indexed token, uint256 amount);
    event ParameterUpdated(string indexed param, uint256 oldValue, uint256 newValue);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    error ZeroAmount();
    error ZeroAddress();
    error InsufficientBalance();
    error InvalidParameter();
    error DeadlineExpired();
    error SlippageExceeded();

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, admin);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice デッドラインチェック
     */
    modifier checkDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        _;
    }

    /**
     * @notice ゼロアドレスチェック
     */
    modifier notZeroAddress(address addr) {
        if (addr == address(0)) revert ZeroAddress();
        _;
    }

    /**
     * @notice ゼロ額チェック
     */
    modifier notZeroAmount(uint256 amount) {
        if (amount == 0) revert ZeroAmount();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice 緊急停止
     * @dev GuardianまたはAdminのみ実行可能
     */
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    /**
     * @notice 停止解除
     * @dev Adminのみ実行可能
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice 緊急時のトークン救出
     * @dev Adminのみ、停止中のみ実行可能
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) whenPaused {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice 安全なトークン転送（入金）
     * @dev 実際に受け取った量を返す（手数料トークン対応）
     */
    function _safeTransferIn(
        address token,
        address from,
        uint256 amount
    ) internal returns (uint256 received) {
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(from, address(this), amount);
        received = IERC20(token).balanceOf(address(this)) - balanceBefore;
    }

    /**
     * @notice 安全なトークン転送（出金）
     */
    function _safeTransferOut(
        address token,
        address to,
        uint256 amount
    ) internal {
        IERC20(token).safeTransfer(to, amount);
    }
}

/**
 * @title SimpleVault
 * @notice ERC4626ベースのシンプルなVault実装例
 */
contract SimpleVault is DeFiBase {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════

    IERC20 public immutable asset;

    mapping(address => uint256) public balances;
    uint256 public totalDeposits;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    constructor(
        address _asset,
        address _admin
    ) DeFiBase(_admin) {
        if (_asset == address(0)) revert ZeroAddress();
        asset = IERC20(_asset);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice 資産をデポジット
     * @param amount デポジット量
     */
    function deposit(
        uint256 amount
    ) external nonReentrant whenNotPaused notZeroAmount(amount) {
        // Effects before Interactions (CEI pattern)
        uint256 received = _safeTransferIn(address(asset), msg.sender, amount);

        balances[msg.sender] += received;
        totalDeposits += received;

        emit Deposit(msg.sender, address(asset), received);
    }

    /**
     * @notice 資産を引き出し
     * @param amount 引き出し量
     */
    function withdraw(
        uint256 amount
    ) external nonReentrant notZeroAmount(amount) {
        if (balances[msg.sender] < amount) revert InsufficientBalance();

        // Effects before Interactions (CEI pattern)
        balances[msg.sender] -= amount;
        totalDeposits -= amount;

        _safeTransferOut(address(asset), msg.sender, amount);

        emit Withdraw(msg.sender, address(asset), amount);
    }

    /**
     * @notice 緊急引き出し（停止中も可能）
     */
    function emergencyWithdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert ZeroAmount();

        balances[msg.sender] = 0;
        totalDeposits -= amount;

        _safeTransferOut(address(asset), msg.sender, amount);

        emit EmergencyWithdraw(msg.sender, address(asset), amount);
    }
}

/**
 * @title SimpleLendingPool
 * @notice シンプルなレンディングプール実装例
 */
contract SimpleLendingPool is DeFiBase {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════

    uint256 public constant PRECISION = 1e18;
    uint256 public constant MAX_LTV = 75e16;              // 75%
    uint256 public constant LIQUIDATION_THRESHOLD = 80e16; // 80%
    uint256 public constant LIQUIDATION_BONUS = 5e16;      // 5%

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════

    IERC20 public immutable collateralToken;
    IERC20 public immutable debtToken;

    // オラクル（実装時は適切なオラクルを使用）
    address public oracle;

    struct Position {
        uint256 collateral;
        uint256 debt;
    }

    mapping(address => Position) public positions;
    uint256 public totalCollateral;
    uint256 public totalDebt;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event Liquidated(address indexed user, address indexed liquidator, uint256 debtCovered, uint256 collateralSeized);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    error ExceedsLTV();
    error NotLiquidatable();
    error ExceedsDebt();

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    constructor(
        address _collateralToken,
        address _debtToken,
        address _oracle,
        address _admin
    ) DeFiBase(_admin) {
        if (_collateralToken == address(0)) revert ZeroAddress();
        if (_debtToken == address(0)) revert ZeroAddress();
        if (_oracle == address(0)) revert ZeroAddress();

        collateralToken = IERC20(_collateralToken);
        debtToken = IERC20(_debtToken);
        oracle = _oracle;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice 担保を預け入れ
     */
    function depositCollateral(
        uint256 amount
    ) external nonReentrant whenNotPaused notZeroAmount(amount) {
        uint256 received = _safeTransferIn(address(collateralToken), msg.sender, amount);

        positions[msg.sender].collateral += received;
        totalCollateral += received;

        emit CollateralDeposited(msg.sender, received);
    }

    /**
     * @notice 担保を引き出し
     */
    function withdrawCollateral(
        uint256 amount
    ) external nonReentrant whenNotPaused notZeroAmount(amount) {
        Position storage position = positions[msg.sender];
        if (position.collateral < amount) revert InsufficientBalance();

        // 引き出し後のLTVチェック
        uint256 newCollateral = position.collateral - amount;
        uint256 collateralValue = _getCollateralValue(newCollateral);
        uint256 debtValue = _getDebtValue(position.debt);

        if (debtValue > 0 && collateralValue * MAX_LTV / PRECISION < debtValue) {
            revert ExceedsLTV();
        }

        position.collateral = newCollateral;
        totalCollateral -= amount;

        _safeTransferOut(address(collateralToken), msg.sender, amount);

        emit CollateralWithdrawn(msg.sender, amount);
    }

    /**
     * @notice 借り入れ
     */
    function borrow(
        uint256 amount
    ) external nonReentrant whenNotPaused notZeroAmount(amount) {
        Position storage position = positions[msg.sender];

        uint256 collateralValue = _getCollateralValue(position.collateral);
        uint256 newDebtValue = _getDebtValue(position.debt + amount);

        if (collateralValue * MAX_LTV / PRECISION < newDebtValue) {
            revert ExceedsLTV();
        }

        position.debt += amount;
        totalDebt += amount;

        _safeTransferOut(address(debtToken), msg.sender, amount);

        emit Borrowed(msg.sender, amount);
    }

    /**
     * @notice 返済
     */
    function repay(
        uint256 amount
    ) external nonReentrant whenNotPaused notZeroAmount(amount) {
        Position storage position = positions[msg.sender];

        uint256 repayAmount = amount > position.debt ? position.debt : amount;

        uint256 received = _safeTransferIn(address(debtToken), msg.sender, repayAmount);

        position.debt -= received;
        totalDebt -= received;

        emit Repaid(msg.sender, received);
    }

    /**
     * @notice 清算
     */
    function liquidate(
        address user,
        uint256 debtToCover
    ) external nonReentrant whenNotPaused notZeroAmount(debtToCover) {
        Position storage position = positions[user];

        // 清算可能かチェック
        uint256 healthFactor = _getHealthFactor(user);
        if (healthFactor >= PRECISION) revert NotLiquidatable();

        // 清算量のチェック（close factor 50%）
        uint256 maxLiquidatable = position.debt / 2;
        uint256 actualDebtToCover = debtToCover > maxLiquidatable ? maxLiquidatable : debtToCover;
        if (actualDebtToCover > position.debt) revert ExceedsDebt();

        // 担保の計算（清算ボーナス込み）
        uint256 collateralToSeize = _calculateCollateralToSeize(actualDebtToCover);
        if (collateralToSeize > position.collateral) {
            collateralToSeize = position.collateral;
        }

        // 債務の返済
        _safeTransferIn(address(debtToken), msg.sender, actualDebtToCover);

        // 状態更新
        position.debt -= actualDebtToCover;
        position.collateral -= collateralToSeize;
        totalDebt -= actualDebtToCover;
        totalCollateral -= collateralToSeize;

        // 担保の移転
        _safeTransferOut(address(collateralToken), msg.sender, collateralToSeize);

        emit Liquidated(user, msg.sender, actualDebtToCover, collateralToSeize);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice ヘルスファクターを取得
     */
    function getHealthFactor(address user) external view returns (uint256) {
        return _getHealthFactor(user);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    function _getHealthFactor(address user) internal view returns (uint256) {
        Position memory position = positions[user];
        if (position.debt == 0) return type(uint256).max;

        uint256 collateralValue = _getCollateralValue(position.collateral);
        uint256 debtValue = _getDebtValue(position.debt);

        return (collateralValue * LIQUIDATION_THRESHOLD) / debtValue;
    }

    function _getCollateralValue(uint256 amount) internal view returns (uint256) {
        // TODO: 実際のオラクル価格を使用
        // return amount * IOracle(oracle).getPrice(address(collateralToken)) / PRECISION;
        return amount; // 簡略化
    }

    function _getDebtValue(uint256 amount) internal view returns (uint256) {
        // TODO: 実際のオラクル価格を使用
        return amount; // 簡略化
    }

    function _calculateCollateralToSeize(uint256 debtToCover) internal view returns (uint256) {
        uint256 debtValue = _getDebtValue(debtToCover);
        uint256 collateralPrice = PRECISION; // TODO: オラクルから取得

        // 清算ボーナス込みの担保量
        return (debtValue * (PRECISION + LIQUIDATION_BONUS)) / collateralPrice;
    }
}
