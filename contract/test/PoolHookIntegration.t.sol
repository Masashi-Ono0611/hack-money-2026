// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {PoolManager} from "v4-core/PoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {HookMiner} from "../src/lib/HookMiner.sol";
import {UtilizationHook} from "../src/hooks/UtilizationHook.sol";
import {IMockOracle, MockOracle} from "../src/MockOracle.sol";
import {ComputeToken} from "../src/ComputeToken.sol";

contract MockUSDCIntegration is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/// @title PoolHookIntegrationTest
/// @notice Task 6.1/6.2: Pool + Hook 統合テスト
contract PoolHookIntegrationTest is Test {
    using PoolIdLibrary for PoolKey;

    uint160 internal constant ALL_HOOK_MASK = uint160((1 << 14) - 1);
    uint160 internal constant SQRT_PRICE_1_1 = 79228162514264337593543950336; // 2^96
    bytes32 internal constant SWAP_EVENT_SIG =
        keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)");
    bytes32 internal constant FEE_OVERRIDDEN_EVENT_SIG = keccak256("FeeOverridden(bytes32,uint256,uint24)");

    function test_deployMockOracleAndHookWithCreate2_thenInitializeCptUsdcPool() public {
        (,, PoolKey memory key,,) = _deployAndInitPoolWithLiquidity();
        PoolId poolId = key.toId();
        assertTrue(PoolId.unwrap(poolId) != bytes32(0), "pool id should be non-zero");
    }

    function test_swap_lowUtilization_appliesLowFee() public {
        (PoolManager poolManager, MockOracle oracle, PoolKey memory key, PoolSwapTest swapRouter,) =
            _deployAndInitPoolWithLiquidity();

        oracle.setUtilization(10);
        vm.recordLogs();

        swapRouter.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: true, amountSpecified: -1e15, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );

        uint24 fee = _extractLastSwapFee(vm.getRecordedLogs(), address(poolManager));
        // Fee(10) = 500 + 9500*100/10000 = 595
        assertEq(fee, 595, "low utilization should apply low fee");
    }

    function test_swap_highUtilization_appliesHighFee() public {
        (PoolManager poolManager, MockOracle oracle, PoolKey memory key, PoolSwapTest swapRouter,) =
            _deployAndInitPoolWithLiquidity();

        oracle.setUtilization(90);
        vm.recordLogs();

        swapRouter.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: true, amountSpecified: -1e15, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );

        uint24 fee = _extractLastSwapFee(vm.getRecordedLogs(), address(poolManager));
        // Fee(90) = 500 + 9500*8100/10000 = 8195
        assertEq(fee, 8195, "high utilization should apply high fee");
    }

    function test_swap_emitsFeeOverriddenWithCorrectValues() public {
        (PoolManager poolManager, MockOracle oracle, PoolKey memory key, PoolSwapTest swapRouter,) =
            _deployAndInitPoolWithLiquidity();

        uint256 utilization = 90;
        oracle.setUtilization(utilization);
        vm.recordLogs();

        swapRouter.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: true, amountSpecified: -1e15, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );

        Vm.Log[] memory logs = vm.getRecordedLogs();
        (bytes32 poolIdFromEvent, uint256 utilizationFromEvent, uint24 feeFromEvent) =
            _extractLastFeeOverridden(logs, address(key.hooks));

        assertEq(poolIdFromEvent, PoolId.unwrap(key.toId()), "poolId should match");
        assertEq(utilizationFromEvent, utilization, "utilization should match");
        assertEq(feeFromEvent, 8195, "fee should match high utilization tier");

        uint24 feeFromSwap = _extractLastSwapFee(logs, address(poolManager));
        assertEq(feeFromSwap, feeFromEvent, "Swap fee should equal FeeOverridden fee");
    }

    function test_swap_staleOracle_appliesDefaultFee() public {
        (PoolManager poolManager, MockOracle oracle, PoolKey memory key, PoolSwapTest swapRouter,) =
            _deployAndInitPoolWithLiquidity();

        oracle.setStaleTtl(60);
        oracle.setUtilization(10);
        vm.warp(block.timestamp + 61);
        vm.recordLogs();

        swapRouter.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: true, amountSpecified: -1e15, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );

        Vm.Log[] memory logs = vm.getRecordedLogs();
        uint24 feeFromSwap = _extractLastSwapFee(logs, address(poolManager));
        assertEq(feeFromSwap, 3000, "stale oracle should force default fee");

        (, uint256 utilizationFromEvent, uint24 feeFromEvent) = _extractLastFeeOverridden(logs, address(key.hooks));
        assertEq(utilizationFromEvent, 10, "event should keep stale utilization value");
        assertEq(feeFromEvent, 3000, "event fee should be default fee");
    }

    function test_create2HookMiner_endToEnd_deployedHookWorks() public {
        (PoolManager poolManager, MockOracle oracle, PoolKey memory key, PoolSwapTest swapRouter, ComputeToken cpt) =
            _deployAndInitPoolWithLiquidity();

        bytes memory creationCode = type(UtilizationHook).creationCode;
        bytes memory constructorArgs = abi.encode(IPoolManager(address(poolManager)), IMockOracle(address(oracle)));
        (address minedAddress, bytes32 minedSalt) =
            HookMiner.find(address(this), Hooks.BEFORE_SWAP_FLAG, creationCode, constructorArgs);

        assertEq(address(key.hooks), minedAddress, "hook should be deployed to mined address");
        assertEq(
            HookMiner.computeAddress(address(this), minedSalt, creationCode, constructorArgs),
            address(key.hooks),
            "computed CREATE2 address should match deployed hook"
        );
        assertEq(uint160(address(key.hooks)) & ALL_HOOK_MASK, Hooks.BEFORE_SWAP_FLAG, "hook address flags should match");
        assertTrue(cpt.balanceOf(address(this)) > 0, "sanity: CPT minted");

        oracle.setUtilization(50);
        vm.recordLogs();
        swapRouter.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: true, amountSpecified: -1e15, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ""
        );

        uint24 fee = _extractLastSwapFee(vm.getRecordedLogs(), address(poolManager));
        // Fee(50) = 500 + 9500*2500/10000 = 2875
        assertEq(fee, 2875, "deployed hook should apply default fee at utilization 50");
    }

    function _deployAndInitPoolWithLiquidity()
        internal
        returns (
            PoolManager poolManager,
            MockOracle oracle,
            PoolKey memory key,
            PoolSwapTest swapRouter,
            ComputeToken cpt
        )
    {
        poolManager = new PoolManager(address(this));
        oracle = new MockOracle();

        bytes memory creationCode = type(UtilizationHook).creationCode;
        bytes memory constructorArgs = abi.encode(IPoolManager(address(poolManager)), IMockOracle(address(oracle)));
        uint160 flags = Hooks.BEFORE_SWAP_FLAG;

        (address expectedHookAddress, bytes32 salt) =
            HookMiner.find(address(this), flags, creationCode, constructorArgs);
        bytes memory initCode = abi.encodePacked(creationCode, constructorArgs);
        address hookAddress;
        assembly ("memory-safe") { hookAddress := create2(0, add(initCode, 0x20), mload(initCode), salt) }
        assertEq(hookAddress, expectedHookAddress, "CREATE2 deployed address should match mined address");
        assertEq(uint160(hookAddress) & ALL_HOOK_MASK, flags, "hook address should contain BEFORE_SWAP flag only");

        cpt = new ComputeToken("Compute Token", "CPT", address(this));
        MockUSDCIntegration usdc = new MockUSDCIntegration();
        usdc.mint(address(this), 1e30);
        cpt.mint(1e30);

        PoolModifyLiquidityTest modifyLiquidityRouter = new PoolModifyLiquidityTest(IPoolManager(address(poolManager)));
        swapRouter = new PoolSwapTest(IPoolManager(address(poolManager)));

        cpt.approve(address(modifyLiquidityRouter), type(uint256).max);
        cpt.approve(address(swapRouter), type(uint256).max);
        usdc.approve(address(modifyLiquidityRouter), type(uint256).max);
        usdc.approve(address(swapRouter), type(uint256).max);

        (address token0, address token1) =
            address(cpt) < address(usdc) ? (address(cpt), address(usdc)) : (address(usdc), address(cpt));

        key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        poolManager.initialize(key, SQRT_PRICE_1_1);

        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({tickLower: -120, tickUpper: 120, liquidityDelta: 1e18, salt: 0}),
            ""
        );
    }

    function _extractLastSwapFee(Vm.Log[] memory logs, address) internal pure returns (uint24 fee) {
        for (uint256 i = logs.length; i > 0; i--) {
            Vm.Log memory log = logs[i - 1];
            if (log.topics.length > 0 && log.topics[0] == SWAP_EVENT_SIG) {
                (,,,,, fee) = abi.decode(log.data, (int128, int128, uint160, uint128, int24, uint24));
                return fee;
            }
        }
        revert("Swap event not found");
    }

    function _extractLastFeeOverridden(Vm.Log[] memory logs, address hookAddress)
        internal
        pure
        returns (bytes32 poolId, uint256 utilization, uint24 fee)
    {
        for (uint256 i = logs.length; i > 0; i--) {
            Vm.Log memory log = logs[i - 1];
            if (log.emitter == hookAddress && log.topics.length > 0 && log.topics[0] == FEE_OVERRIDDEN_EVENT_SIG) {
                poolId = log.topics[1];
                (utilization, fee) = abi.decode(log.data, (uint256, uint24));
                return (poolId, utilization, fee);
            }
        }
        revert("FeeOverridden event not found");
    }
}
