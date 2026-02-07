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
    /// @notice Fee tier for low utilization (0.05%)
    uint24 public constant LOW_FEE = 500;
    /// @notice Fee tier for normal utilization (0.3%)
    uint24 public constant DEFAULT_FEE = 3000;
    /// @notice Fee tier for high utilization (1.0%)
    uint24 public constant HIGH_FEE = 10000;

    /// @notice Utilization threshold below which LOW_FEE applies
    uint256 public constant LOW_THRESHOLD = 30;
    /// @notice Utilization threshold above which HIGH_FEE applies
    uint256 public constant HIGH_THRESHOLD = 70;

    /// @notice Emitted when dynamic fee is applied during a swap
    event FeeOverridden(PoolId indexed poolId, uint256 utilization, uint24 fee);
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

    /// @notice 稼働率に応じた手数料を計算
    /// @param utilization 稼働率（0-100）
    /// @return fee 手数料（bps）
    function calculateDynamicFee(uint256 utilization) public pure returns (uint24) {
        if (utilization > 100) {
            return DEFAULT_FEE;
        }
        if (utilization < LOW_THRESHOLD) {
            return LOW_FEE;
        } else if (utilization >= HIGH_THRESHOLD) {
            return HIGH_FEE;
        } else {
            return DEFAULT_FEE;
        }
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
        (uint256 utilization,,,) = oracle.getUtilizationWithMeta();
        uint24 fee = calculateDynamicFee(utilization);
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

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        revert("not implemented");
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        revert("not implemented");
    }
}
