// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta} from "v4-core/types/BeforeSwapDelta.sol";
import {PoolId} from "v4-core/types/PoolId.sol";
import {IMockOracle} from "../MockOracle.sol";

/// @title UtilizationHook
/// @notice Uniswap v4 Hook that adjusts swap fees based on L2 utilization rate
/// @dev Implements IHooks interface; only beforeSwap is active
contract UtilizationHook is IHooks {
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

    IPoolManager public immutable poolManager;
    IMockOracle public immutable oracle;

    constructor(IPoolManager _poolManager, IMockOracle _oracle) {
        poolManager = _poolManager;
        oracle = _oracle;
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

    function beforeSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, bytes calldata)
        external
        virtual
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        revert("not implemented");
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
