# Uniswap v4 Hooks Deep Dive

## Overview

Hooks are the killer feature of Uniswap v4. They allow custom logic to execute at specific points in a pool's lifecycle, enabling innovations like:
- Dynamic fees
- TWAMM (Time-Weighted AMM)
- Limit orders
- Custom oracles
- MEV distribution
- On-chain limit orders
- Geofencing/compliance

## Hook Lifecycle Points

### Available Hook Functions

```solidity
interface IHooks {
    // Pool Initialization
    function beforeInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96) external returns (bytes4);
    function afterInitialize(address sender, PoolKey calldata key, uint160 sqrtPriceX96, int24 tick) external returns (bytes4);

    // Liquidity Modification
    function beforeAddLiquidity(address sender, PoolKey calldata key, IPoolManager.ModifyLiquidityParams calldata params) external returns (bytes4);
    function afterAddLiquidity(address sender, PoolKey calldata key, IPoolManager.ModifyLiquidityParams calldata params) external returns (bytes4, BalanceDelta);

    function beforeRemoveLiquidity(address sender, PoolKey calldata key, IPoolManager.ModifyLiquidityParams calldata params) external returns (bytes4);
    function afterRemoveLiquidity(address sender, PoolKey calldata key, IPoolManager.ModifyLiquidityParams calldata params) external returns (bytes4, BalanceDelta);

    // Swaps
    function beforeSwap(address sender, PoolKey calldata key, IPoolManager.SwapParams calldata params) external returns (bytes4, BeforeSwapDelta, uint24);
    function afterSwap(address sender, PoolKey calldata key, IPoolManager.SwapParams calldata params, BalanceDelta delta) external returns (bytes4, int128);

    // Donate
    function beforeDonate(address sender, PoolKey calldata key, uint256 amount0, uint256 amount1) external returns (bytes4);
    function afterDonate(address sender, PoolKey calldata key, uint256 amount0, uint256 amount1) external returns (bytes4);
}
```

## Hook Permissions System

Hooks declare their permissions via address encoding. The hook contract address's leading bits determine which functions it implements:

```
Hook Address: 0x[PERMISSIONS]... (first 10 bits encode permissions)

Bit Position | Permission
-------------|------------
0            | beforeInitialize
1            | afterInitialize
2            | beforeAddLiquidity
3            | afterAddLiquidity
4            | beforeRemoveLiquidity
5            | afterRemoveLiquidity
6            | beforeSwap
7            | afterSwap
8            | beforeDonate
9            | afterDonate
```

**Important**: Hook addresses must have correct permission bits. Use CREATE2 to mine addresses with correct prefixes.

## Common Hook Patterns

### Pattern 1: Dynamic Fee Hook

Adjust fees based on volatility, time, or other factors:

```solidity
contract DynamicFeeHook is BaseHook {
    function beforeSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata,
        bytes calldata
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        // Calculate dynamic fee based on volatility
        uint24 dynamicFee = calculateVolatilityFee(key);

        return (this.beforeSwap.selector, BeforeSwapDelta.wrap(0), dynamicFee);
    }

    function calculateVolatilityFee(PoolKey calldata key) internal view returns (uint24) {
        // Implement volatility calculation
        // Higher volatility → higher fees
        return baseFee + volatilityPremium;
    }
}
```

### Pattern 2: Limit Order Hook

Execute limit orders when price reaches target:

```solidity
contract LimitOrderHook is BaseHook {
    struct LimitOrder {
        address owner;
        int24 tickThreshold;
        uint128 amount;
        bool zeroForOne;
    }

    mapping(PoolId => LimitOrder[]) public orders;

    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external override returns (bytes4, int128) {
        // Check if any limit orders should execute
        int24 currentTick = getCurrentTick(key);
        executeMatchingOrders(key, currentTick);

        return (this.afterSwap.selector, 0);
    }

    function placeOrder(
        PoolKey calldata key,
        int24 tickThreshold,
        uint128 amount,
        bool zeroForOne
    ) external {
        orders[key.toId()].push(LimitOrder({
            owner: msg.sender,
            tickThreshold: tickThreshold,
            amount: amount,
            zeroForOne: zeroForOne
        }));
    }
}
```

### Pattern 3: TWAMM Hook

Time-Weighted Average Market Maker for large orders:

```solidity
contract TWAMMHook is BaseHook {
    struct TWAMMOrder {
        address owner;
        uint256 sellAmount;
        uint256 startTime;
        uint256 endTime;
        uint256 executedAmount;
    }

    function beforeSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        // Execute pending TWAMM orders proportionally
        executeTWAMMOrders(key);

        return (this.beforeSwap.selector, BeforeSwapDelta.wrap(0), 0);
    }

    function submitLongTermOrder(
        PoolKey calldata key,
        uint256 amount,
        uint256 duration
    ) external {
        // Create TWAMM order that executes over time
    }
}
```

### Pattern 4: Oracle Integration Hook

Update external oracle on each swap:

```solidity
contract OracleHook is BaseHook {
    IOracle public oracle;

    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata,
        BalanceDelta delta,
        bytes calldata
    ) external override returns (bytes4, int128) {
        // Update oracle with new price
        uint160 sqrtPriceX96 = getCurrentSqrtPrice(key);
        oracle.update(key.toId(), sqrtPriceX96, block.timestamp);

        return (this.afterSwap.selector, 0);
    }
}
```

## Hook Development Workflow

### 1. Design Hook Logic

Determine which lifecycle points you need:
- **before** hooks: Validate, modify parameters, revert
- **after** hooks: React to state changes, trigger external calls

### 2. Implement BaseHook

```solidity
import {BaseHook} from "v4-periphery/BaseHook.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";

contract MyHook is BaseHook {
    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,    // Enable beforeSwap
            afterSwap: true,     // Enable afterSwap
            beforeDonate: false,
            afterDonate: false
        });
    }
}
```

### 3. Mine Hook Address

Hook address must match permissions. Use HookMiner:

```typescript
import { HookMiner } from '@uniswap/v4-sdk';

// Find address with correct permissions
const { address, salt } = await HookMiner.find(
  deployerAddress,
  {
    beforeSwap: true,
    afterSwap: true,
    // other permissions...
  },
  bytecode
);

// Deploy with CREATE2 using found salt
const hook = await deployWithCreate2(address, salt, bytecode);
```

### 4. Register Hook with Pool

```solidity
PoolKey memory key = PoolKey({
    currency0: token0,
    currency1: token1,
    fee: 3000,
    tickSpacing: 60,
    hooks: IHooks(hookAddress)  // Your hook contract
});

poolManager.initialize(key, sqrtPriceX96);
```

## Security Considerations

### 1. Reentrancy Protection

Hooks can be reentered. Always use reentrancy guards:

```solidity
import {ReentrancyGuard} from "openzeppelin/security/ReentrancyGuard.sol";

contract SafeHook is BaseHook, ReentrancyGuard {
    function beforeSwap(...) external override nonReentrant returns (...) {
        // Safe from reentrancy
    }
}
```

### 2. Gas Limits

Hooks execute during swaps. Keep gas usage low:
- Avoid unbounded loops
- Cache storage reads
- Use events for historical data
- Consider off-chain computation

### 3. Validation

Always validate inputs and state:

```solidity
function beforeSwap(...) external override returns (...) {
    require(params.amountSpecified != 0, "Zero amount");
    require(isValidPool(key), "Invalid pool");
    // ... other validations
}
```

### 4. Return Values

Must return correct selector:

```solidity
return (this.beforeSwap.selector, ...);  // Correct
return (bytes4(0), ...);                  // WRONG - will revert
```

## Testing Hooks

Use v4-core test utilities:

```solidity
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {Test} from "forge-std/Test.sol";

contract MyHookTest is Test {
    PoolManager poolManager;
    MyHook hook;

    function setUp() public {
        poolManager = new PoolManager(500000);
        hook = new MyHook(poolManager);

        // Initialize pool with hook
        PoolKey memory key = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        poolManager.initialize(key, SQRT_PRICE_1_1);
    }

    function testHookBehavior() public {
        // Test swap triggers hook correctly
        swap(key, true, 1 ether);
        assertEq(hook.swapCount(), 1);
    }
}
```

## Gas Optimization Tips

1. **Minimize Storage**: Storage is expensive. Use events or off-chain indexing.
2. **Batch Operations**: Combine multiple updates in single hook call.
3. **Lazy Computation**: Calculate on-demand rather than storing.
4. **Use Transient Storage**: For temporary data within transaction.
5. **Optimize Loops**: Avoid unbounded iteration.

## Common Pitfalls

1. **Wrong Permission Bits**: Address must match declared permissions
2. **Incorrect Selector**: Must return function's own selector
3. **Gas Limit Exceeded**: Hooks must complete within block gas limit
4. **Reentrancy**: Protect against reentrant calls
5. **State Inconsistency**: Pool state may change during hook execution

## Hook Examples Repository

Uniswap provides example hooks:
- `FullRangeHook`: Concentrated liquidity at full range
- `GeomeanOracle`: Geometric mean oracle
- `LimitOrder`: On-chain limit orders
- `VolatilityOracle`: Volatility tracking

Repository: https://github.com/Uniswap/v4-periphery/tree/main/contracts/hooks

## Resources

- v4 Hooks Docs: https://docs.uniswap.org/contracts/v4/concepts/hooks
- Hook Template: https://github.com/Uniswap/v4-template
- Example Hooks: https://github.com/Uniswap/v4-periphery
- SDK Hook Support: https://docs.uniswap.org/sdk/v4/guides/hooks
