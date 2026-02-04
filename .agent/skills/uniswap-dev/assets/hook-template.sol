// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-periphery/BaseHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";

/**
 * @title CustomHook
 * @notice Template for creating custom Uniswap v4 hooks
 * @dev Extend this template and implement desired hook functions
 */
contract CustomHook is BaseHook {
    // Custom state variables
    mapping(address => uint256) public userSwapCount;

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    /**
     * @notice Define which hook functions this contract implements
     * @dev Set to true for each hook function you want to enable
     */
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,      // Enable beforeSwap
            afterSwap: true,       // Enable afterSwap
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /**
     * @notice Called before a swap executes
     * @dev Use for validation, dynamic fees, or custom pre-swap logic
     */
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        // Example: Track swap count
        userSwapCount[sender]++;

        // Example: Implement dynamic fee based on volatility
        uint24 dynamicFee = calculateDynamicFee(key);

        // Must return selector, delta (usually 0), and optional dynamic fee
        return (
            this.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            dynamicFee  // 0 to use pool's base fee
        );
    }

    /**
     * @notice Called after a swap executes
     * @dev Use for post-swap actions like oracle updates
     */
    function afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override returns (bytes4, int128) {
        // Example: Log swap for analytics
        emit SwapExecuted(sender, address(key.currency0), address(key.currency1), delta);

        // Must return selector and unspecified delta (usually 0)
        return (this.afterSwap.selector, 0);
    }

    /**
     * @notice Called before pool initialization
     */
    function beforeInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        bytes calldata hookData
    ) external override returns (bytes4) {
        // Custom initialization logic
        return this.beforeInitialize.selector;
    }

    /**
     * @notice Called after pool initialization
     */
    function afterInitialize(
        address sender,
        PoolKey calldata key,
        uint160 sqrtPriceX96,
        int24 tick,
        bytes calldata hookData
    ) external override returns (bytes4) {
        // Post-initialization logic
        return this.afterInitialize.selector;
    }

    /**
     * @notice Called before liquidity is added
     */
    function beforeAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4) {
        // Pre-liquidity addition logic
        return this.beforeAddLiquidity.selector;
    }

    /**
     * @notice Called after liquidity is added
     */
    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override returns (bytes4, BalanceDelta) {
        // Post-liquidity addition logic
        return (this.afterAddLiquidity.selector, delta);
    }

    // ============ Helper Functions ============

    /**
     * @notice Calculate dynamic fee based on pool conditions
     * @dev Example implementation - customize based on your logic
     */
    function calculateDynamicFee(PoolKey calldata key) internal view returns (uint24) {
        // Example: Base fee + volatility premium
        uint24 baseFee = 3000; // 0.3%

        // Add volatility calculation logic here
        // For now, return base fee
        return baseFee;
    }

    // ============ Events ============

    event SwapExecuted(
        address indexed user,
        address indexed token0,
        address indexed token1,
        BalanceDelta delta
    );
}
