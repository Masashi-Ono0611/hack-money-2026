# Uniswap Security Best Practices

## Critical Security Principles

### 1. Slippage Protection

Always set maximum slippage tolerance to prevent sandwich attacks and price manipulation.

**Bad Example** (No slippage protection):
```typescript
// DANGEROUS - No minimum output specified
const params = {
  tokenIn: USDC,
  tokenOut: WETH,
  amountIn: parseUnits('1000', 6),
  amountOutMinimum: 0,  // ❌ VULNERABLE TO SANDWICH ATTACKS
};
```

**Good Example** (Proper slippage):
```typescript
// Safe - Calculate minimum output with slippage tolerance
const slippageTolerance = new Percent(50, 10000); // 0.5%
const expectedOutput = calculateExpectedOutput(route, amountIn);
const minOutput = expectedOutput.multiply(
  new Percent(10000 - 50, 10000)
);

const params = {
  tokenIn: USDC,
  tokenOut: WETH,
  amountIn: parseUnits('1000', 6),
  amountOutMinimum: minOutput,  // ✅ Protected
};
```

### 2. Deadline Protection

Always set transaction deadlines to prevent stale transactions.

**Bad Example**:
```typescript
const deadline = MaxUint256;  // ❌ No deadline protection
```

**Good Example**:
```typescript
const deadline = Math.floor(Date.now() / 1000) + 60 * 20;  // ✅ 20 minutes
```

### 3. Price Oracle Manipulation

Never use spot prices for important decisions. Use TWAP (Time-Weighted Average Price).

**Bad Example**:
```solidity
// ❌ Vulnerable to flash loan manipulation
uint256 price = pool.slot0().sqrtPriceX96;
require(collateralValue > debtValue, "Undercollateralized");
```

**Good Example** (v3):
```solidity
// ✅ Use TWAP to prevent manipulation
uint32[] memory secondsAgos = new uint32[](2);
secondsAgos[0] = 1800;  // 30 minutes ago
secondsAgos[1] = 0;     // now

(int56[] memory tickCumulatives,) = pool.observe(secondsAgos);
int24 avgTick = int24((tickCumulatives[1] - tickCumulatives[0]) / 1800);
uint256 twapPrice = OracleLibrary.getQuoteAtTick(avgTick, amount, baseToken, quoteToken);
```

### 4. Reentrancy Protection

Uniswap v3/v4 pools have reentrancy guards, but your contracts may not.

**Pattern**:
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MyDeFiProtocol is ReentrancyGuard {
    function swapAndDoSomething() external nonReentrant {
        // Swap logic
        // Additional logic
    }
}
```

### 5. Front-Running / MEV Protection

**For v2/v3 Swaps**:
```typescript
// Option 1: Use private mempool (Flashbots Protect)
import { FlashbotsBundleProvider } from '@flashbots/ethers-provider-bundle';

const flashbotsProvider = await FlashbotsBundleProvider.create(
  provider,
  authSigner,
  'https://relay.flashbots.net'
);

const signedBundle = await flashbotsProvider.signBundle([
  { signedTransaction: signedTx }
]);

// Option 2: Use UniswapX (built-in MEV protection)
import { DutchOrder } from '@uniswap/uniswapx-sdk';

const order = new DutchOrder({
  decayStartTime: Math.floor(Date.now() / 1000),
  decayEndTime: Math.floor(Date.now() / 1000) + 300,
  input: { token: USDC, amount: inputAmount },
  outputs: [{ token: WETH, startAmount, endAmount }],
  // ...
});
```

## Common Vulnerabilities

### 1. Unchecked Return Values

Always check return values from pool operations:

```solidity
// ❌ Ignoring return value
pool.swap(...);

// ✅ Check return value
(int256 amount0, int256 amount1) = pool.swap(...);
require(amount0 > minAmount0 || amount1 > minAmount1, "Insufficient output");
```

### 2. Incorrect Token Ordering

Uniswap orders tokens by address. Swap direction depends on ordering:

```typescript
// ✅ Correct ordering
const token0 = USDC.address < WETH.address ? USDC : WETH;
const token1 = USDC.address < WETH.address ? WETH : USDC;
const zeroForOne = tokenIn.equals(token0);

const params = {
  zeroForOne,  // Correct direction
  amountSpecified,
  sqrtPriceLimitX96,
};
```

### 3. Arithmetic Overflow/Underflow

Use SafeMath or Solidity 0.8+ built-in checks:

```solidity
// Solidity 0.8+ automatically checks
uint256 result = a + b;  // ✅ Reverts on overflow

// For older versions
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
using SafeMath for uint256;

uint256 result = a.add(b);  // ✅ Reverts on overflow
```

### 4. Liquidity Sandwich Attacks

When adding liquidity, protect against front-running:

```solidity
// ✅ Set minimum amounts
INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
    token0: token0,
    token1: token1,
    fee: fee,
    tickLower: tickLower,
    tickUpper: tickUpper,
    amount0Desired: amount0,
    amount1Desired: amount1,
    amount0Min: amount0 * 95 / 100,  // 5% slippage tolerance
    amount1Min: amount1 * 95 / 100,
    recipient: msg.sender,
    deadline: deadline
});
```

### 5. Callback Validation

Always validate callbacks are from legitimate Uniswap pools:

```solidity
contract MyContract is IUniswapV3SwapCallback {
    address public immutable factory;

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external override {
        // ✅ Verify callback is from legitimate pool
        CallbackValidation.verifyCallback(factory, msg.sender);

        // Process callback
    }
}
```

## v4-Specific Security

### Hook Security

Hooks introduce new attack surfaces:

**1. Malicious Hooks**:
```solidity
// ❌ Never trust arbitrary hooks
function swapWithUntrustedHook(PoolKey memory key) external {
    // Dangerous if key.hooks is malicious
    poolManager.swap(key, params);
}

// ✅ Use whitelisted hooks
mapping(address => bool) public trustedHooks;

function swapWithTrustedHook(PoolKey memory key) external {
    require(trustedHooks[address(key.hooks)], "Untrusted hook");
    poolManager.swap(key, params);
}
```

**2. Hook Reentrancy**:
```solidity
// In your hook contract
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MyHook is BaseHook, ReentrancyGuard {
    function beforeSwap(...) external override nonReentrant returns (...) {
        // Protected against reentrancy
    }
}
```

**3. Hook Gas Griefing**:
```solidity
// ✅ Limit gas consumption in hooks
function beforeSwap(...) external override returns (...) {
    uint256 gasStart = gasleft();

    // Hook logic

    require(gasStart - gasleft() < MAX_HOOK_GAS, "Gas limit exceeded");
    return (this.beforeSwap.selector, ...);
}
```

## Audit Checklist

Before deploying Uniswap integrations:

- [ ] Slippage protection implemented
- [ ] Deadline protection on all transactions
- [ ] Using TWAP for price feeds (not spot prices)
- [ ] Reentrancy guards on state-changing functions
- [ ] Return values checked from pool operations
- [ ] Token ordering handled correctly
- [ ] MEV protection considered (private mempool or UniswapX)
- [ ] Callback validation for v3/v4 pools
- [ ] Hook contracts audited (if using v4 hooks)
- [ ] Front-running scenarios analyzed
- [ ] Test coverage >90%
- [ ] Formal verification considered for critical logic
- [ ] Third-party security audit completed

## Testing Security

### Fuzz Testing Example

```solidity
// Using Foundry
contract UniswapIntegrationTest is Test {
    function testFuzz_SwapWithSlippage(uint256 amountIn) public {
        vm.assume(amountIn > 1e6 && amountIn < 1e12);

        uint256 minAmountOut = getMinOutput(amountIn, slippageTolerance);

        vm.expectRevert(); // Should revert if slippage exceeded
        swap(amountIn, 0);

        // Should succeed with proper minimum
        swap(amountIn, minAmountOut);
    }
}
```

### Invariant Testing

```solidity
contract InvariantTest is Test {
    function invariant_PoolBalanceMatchesAccounting() public {
        // Pool's token balance should always match internal accounting
        assertEq(
            token0.balanceOf(address(pool)),
            pool.reserve0()
        );
    }

    function invariant_NoNegativeBalances() public {
        // User balances should never be negative
        assertTrue(getUserBalance(user1) >= 0);
    }
}
```

## Incident Response

If you discover a vulnerability:

1. **Do not** disclose publicly
2. Contact Uniswap Labs: security@uniswap.org
3. Pause affected contracts if possible
4. Document the vulnerability
5. Prepare mitigation plan
6. Coordinate disclosure with Uniswap team

## Security Resources

- **Audits**: https://docs.uniswap.org/contracts/v4/overview/audits
- **Bug Bounty**: https://uniswap.org/bug-bounty
- **Security Contact**: security@uniswap.org
- **Best Practices**: https://docs.uniswap.org/contracts/v3/guides/security
- **Trail of Bits Audit**: https://github.com/Uniswap/v4-core/blob/main/audits

## Additional Resources

- Smart Contract Security Best Practices: https://consensys.github.io/smart-contract-best-practices/
- OpenZeppelin Security: https://docs.openzeppelin.com/contracts/4.x/api/security
- Secureum: https://secureum.substack.com/
