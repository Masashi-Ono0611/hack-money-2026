// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {IMockOracle} from "../MockOracle.sol";

/// @title UtilizationHook
/// @notice Uniswap v4 Hook that adjusts swap fees based on L2 utilization rate
/// @dev Implements IHooks interface; only beforeSwap is active
contract UtilizationHook is IHooks {
    using PoolIdLibrary for PoolKey;
    /// @notice Minimum fee at 0% utilization (0.05%)
    uint24 public constant FEE_MIN = 500;
    /// @notice Maximum fee at 100% utilization (1.0%)
    uint24 public constant FEE_MAX = 10000;
    /// @notice Fallback fee used when oracle data is stale (0.3%)
    uint24 public constant STALE_FALLBACK_FEE = 3000;

    /// @notice Emitted when dynamic fee is applied during a swap
    event FeeOverridden(PoolId indexed poolId, uint256 utilization, uint24 fee);
    /// @notice Emitted when stale oracle data forces DEFAULT_FEE fallback
    event StaleFallbackApplied(PoolId indexed poolId, uint256 utilization, uint8 source, uint24 fee);
    error UnauthorizedCaller(address caller);

    IPoolManager public immutable poolManager;
    IMockOracle public immutable oracle;

    constructor(IPoolManager _poolManager, IMockOracle _oracle) {
        poolManager = _poolManager;
        oracle = _oracle;
    }

    /// @notice Hook の権限を定義（beforeSwap のみ有効）
    function getHookPermissions() public pure returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /// @notice Compute dynamic fee as a continuous quadratic function of utilization
    /// @dev Fee(u) = FEE_MIN + (FEE_MAX - FEE_MIN) × u² / 10000
    ///      where u = utilization (0-100). This yields:
    ///        u=0   → 500 bps (0.05%)   u=50 → 2875 bps (0.29%)
    ///        u=10  → 595 bps (0.06%)   u=70 → 5155 bps (0.52%)
    ///        u=30  → 1355 bps (0.14%)  u=100 → 10000 bps (1.00%)
    /// @param utilization 稼働率（0-100）
    /// @return fee 手数料（bps）
    function calculateDynamicFee(uint256 utilization) public pure returns (uint24) {
        if (utilization > 100) {
            return STALE_FALLBACK_FEE;
        }
        // Fee = FEE_MIN + (FEE_MAX - FEE_MIN) * u^2 / 10000
        // u^2 max = 10000, so result is always in [FEE_MIN, FEE_MAX]
        return uint24(uint256(FEE_MIN) + (uint256(FEE_MAX - FEE_MIN) * utilization * utilization) / 10000);
    }

    // ─── IHooks implementation (only beforeSwap is active) ───

    function beforeInitialize(address, PoolKey calldata, uint160) external pure returns (bytes4) {
        revert("not implemented");
    }

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure returns (bytes4) {
        revert("not implemented");
    }

    function beforeAddLiquidity(address, PoolKey calldata, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        revert("not implemented");
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure returns (bytes4, BalanceDelta) {
        revert("not implemented");
    }

    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        revert("not implemented");
    }

    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure returns (bytes4, BalanceDelta) {
        revert("not implemented");
    }

    function beforeSwap(address, PoolKey calldata key, IPoolManager.SwapParams calldata, bytes calldata)
        external
        virtual
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        if (msg.sender != address(poolManager)) {
            revert UnauthorizedCaller(msg.sender);
        }
        (uint256 utilization,, bool stale, uint8 source) = oracle.getUtilizationWithMeta();
        uint24 fee = stale ? STALE_FALLBACK_FEE : calculateDynamicFee(utilization);
        if (stale) {
            emit StaleFallbackApplied(key.toId(), utilization, source, fee);
        }
        emit FeeOverridden(key.toId(), utilization, fee);
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, fee | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    function afterSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, BalanceDelta, bytes calldata)
        external
        pure
        returns (bytes4, int128)
    {
        revert("not implemented");
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert("not implemented");
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata) external pure returns (bytes4) {
        revert("not implemented");
    }
}
