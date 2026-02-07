// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {IMockOracle} from "../src/MockOracle.sol";
import {IComputeToken} from "../src/ComputeToken.sol";

/// @title VerifyHookBehavior
/// @notice Pool 初期化後に UtilizationHook の手数料反映を実スワップで検証するスクリプト
contract VerifyHookBehavior is Script {
    using PoolIdLibrary for PoolKey;

    bytes32 internal constant SWAP_EVENT_SIG =
        keccak256("Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)");
    bytes32 internal constant FEE_OVERRIDDEN_EVENT_SIG = keccak256("FeeOverridden(bytes32,uint256,uint24)");
    int24 internal constant DEFAULT_TICK_SPACING = 60;

    struct VerifyConfig {
        uint256 deployerPrivateKey;
        address deployer;
        string chainName;
        uint256 swapInputAmount;
        uint256 utilLow;
        uint256 utilMid;
        uint256 utilHigh;
        uint256 utilStale;
        uint256 staleTtlSeconds;
        uint256 staleWarpSeconds;
        address poolManager;
        address cpt;
        address usdc;
        address hook;
        address oracle;
        bytes32 configuredPoolId;
    }

    function run() external {
        VerifyConfig memory cfg = _loadConfig();
        PoolKey memory key = _buildPoolKey(cfg.cpt, cfg.usdc, cfg.hook);
        bytes32 computedPoolId = PoolId.unwrap(key.toId());
        require(computedPoolId == cfg.configuredPoolId, "VerifyHookBehavior: poolId mismatch");

        address swapRouter = _deploySwapRouterAndPrepareBalances(cfg);

        console.log("Verifier:", cfg.deployer);
        console.log("Chain:", cfg.chainName);
        console.log("PoolManager:", cfg.poolManager);
        console.log("Hook:", cfg.hook);
        console.log("Oracle:", cfg.oracle);
        console.log("PoolId:", vm.toString(cfg.configuredPoolId));
        console.log("SwapInputAmount:", cfg.swapInputAmount);

        _verifyOne(cfg.deployerPrivateKey, swapRouter, key, cfg.oracle, cfg.utilLow, 500, cfg.cpt, cfg.swapInputAmount);
        _verifyOne(cfg.deployerPrivateKey, swapRouter, key, cfg.oracle, cfg.utilMid, 3000, cfg.cpt, cfg.swapInputAmount);
        _verifyOne(
            cfg.deployerPrivateKey, swapRouter, key, cfg.oracle, cfg.utilHigh, 10000, cfg.cpt, cfg.swapInputAmount
        );
        _verifyStale(cfg, swapRouter, key);

        console.log("VerifyHookBehavior: success");
    }

    function _loadConfig() internal view returns (VerifyConfig memory cfg) {
        cfg.deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        cfg.deployer = vm.addr(cfg.deployerPrivateKey);
        cfg.chainName = vm.envString("CHAIN_NAME");
        _validateSupportedChain(cfg.chainName);

        cfg.swapInputAmount = vm.envOr("SWAP_INPUT_AMOUNT", uint256(1e15));
        require(cfg.swapInputAmount <= uint256(type(int256).max), "VerifyHookBehavior: SWAP_INPUT_AMOUNT too large");
        cfg.utilLow = vm.envOr("UTIL_LOW", uint256(10));
        cfg.utilMid = vm.envOr("UTIL_MID", uint256(50));
        cfg.utilHigh = vm.envOr("UTIL_HIGH", uint256(90));
        cfg.utilStale = vm.envOr("UTIL_STALE", uint256(10));
        cfg.staleTtlSeconds = vm.envOr("STALE_TTL_SECONDS", uint256(60));
        cfg.staleWarpSeconds = vm.envOr("STALE_WARP_SECONDS", uint256(61));
        _validateUtilization(cfg.utilLow);
        _validateUtilization(cfg.utilMid);
        _validateUtilization(cfg.utilHigh);
        _validateUtilization(cfg.utilStale);
        require(cfg.staleWarpSeconds > cfg.staleTtlSeconds, "VerifyHookBehavior: stale warp must exceed ttl");

        string memory root = vm.projectRoot();
        string memory deployedPath = string.concat(root, "/deployed-addresses.json");
        cfg.poolManager = _readAddress(string.concat(root, "/uniswap-v4-addresses.json"), cfg.chainName);
        cfg.cpt = _readAddress(deployedPath, cfg.chainName, "cpt");
        cfg.usdc = _readAddress(string.concat(root, "/usdc-addresses.json"), cfg.chainName);
        cfg.hook = _readAddress(deployedPath, cfg.chainName, "hook");
        cfg.oracle = _readAddress(deployedPath, cfg.chainName, "oracle");
        cfg.configuredPoolId = _readPoolId(deployedPath, cfg.chainName, "poolId");
    }

    function _deploySwapRouterAndPrepareBalances(VerifyConfig memory cfg) internal returns (address swapRouter) {
        vm.startBroadcast(cfg.deployerPrivateKey);
        swapRouter = address(new PoolSwapTest(IPoolManager(cfg.poolManager)));
        IComputeToken(cfg.cpt).mint(cfg.swapInputAmount * 10);
        IERC20(cfg.cpt).approve(swapRouter, type(uint256).max);
        IERC20(cfg.usdc).approve(swapRouter, type(uint256).max);
        vm.stopBroadcast();
    }

    function _verifyOne(
        uint256 deployerPrivateKey,
        address swapRouter,
        PoolKey memory key,
        address oracle,
        uint256 utilization,
        uint24 expectedFee,
        address cpt,
        uint256 swapInputAmount
    ) internal {
        vm.recordLogs();

        vm.startBroadcast(deployerPrivateKey);
        IMockOracle(oracle).setUtilization(utilization);
        PoolSwapTest(swapRouter)
            .swap(
                key,
                IPoolManager.SwapParams({
                    zeroForOne: Currency.unwrap(key.currency0) == cpt,
                    amountSpecified: -int256(swapInputAmount),
                    sqrtPriceLimitX96: Currency.unwrap(key.currency0) == cpt
                        ? TickMath.MIN_SQRT_PRICE + 1
                        : TickMath.MAX_SQRT_PRICE - 1
                }),
                PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
                ""
            );
        vm.stopBroadcast();

        Vm.Log[] memory logs = vm.getRecordedLogs();
        uint24 feeFromSwap = _extractLastSwapFee(logs);
        (bytes32 poolIdFromEvent, uint256 utilizationFromEvent, uint24 feeFromEvent) =
            _extractLastFeeOverridden(logs, address(key.hooks));

        require(poolIdFromEvent == PoolId.unwrap(key.toId()), "VerifyHookBehavior: invalid poolId in event");
        require(utilizationFromEvent == utilization, "VerifyHookBehavior: invalid utilization in event");
        require(feeFromEvent == expectedFee, "VerifyHookBehavior: invalid fee in event");
        require(feeFromSwap == expectedFee, "VerifyHookBehavior: invalid swap fee");

        console.log("utilization:", utilization);
        console.log("expected fee:", uint256(expectedFee));
        console.log("observed fee:", uint256(feeFromSwap));
    }

    function _verifyStale(VerifyConfig memory cfg, address swapRouter, PoolKey memory key) internal {
        vm.recordLogs();

        vm.startBroadcast(cfg.deployerPrivateKey);
        IMockOracle(cfg.oracle).setStaleTtl(cfg.staleTtlSeconds);
        IMockOracle(cfg.oracle).setUtilization(cfg.utilStale);
        vm.warp(block.timestamp + cfg.staleWarpSeconds);
        PoolSwapTest(swapRouter)
            .swap(
                key,
                IPoolManager.SwapParams({
                    zeroForOne: Currency.unwrap(key.currency0) == cfg.cpt,
                    amountSpecified: -int256(cfg.swapInputAmount),
                    sqrtPriceLimitX96: Currency.unwrap(key.currency0) == cfg.cpt
                        ? TickMath.MIN_SQRT_PRICE + 1
                        : TickMath.MAX_SQRT_PRICE - 1
                }),
                PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
                ""
            );
        vm.stopBroadcast();

        Vm.Log[] memory logs = vm.getRecordedLogs();
        uint24 feeFromSwap = _extractLastSwapFee(logs);
        (bytes32 poolIdFromEvent, uint256 utilizationFromEvent, uint24 feeFromEvent) =
            _extractLastFeeOverridden(logs, address(key.hooks));

        require(poolIdFromEvent == PoolId.unwrap(key.toId()), "VerifyHookBehavior: invalid stale poolId");
        require(utilizationFromEvent == cfg.utilStale, "VerifyHookBehavior: invalid stale utilization");
        require(feeFromEvent == 3000, "VerifyHookBehavior: stale event fee should be default");
        require(feeFromSwap == 3000, "VerifyHookBehavior: stale swap fee should be default");

        console.log("stale utilization:", cfg.utilStale);
        console.log("stale expected fee:", uint256(3000));
        console.log("stale observed fee:", uint256(feeFromSwap));
    }

    function _buildPoolKey(address cpt, address usdc, address hook) internal pure returns (PoolKey memory key) {
        (address token0, address token1) = cpt < usdc ? (cpt, usdc) : (usdc, cpt);
        key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: DEFAULT_TICK_SPACING,
            hooks: IHooks(hook)
        });
    }

    function _readAddress(string memory path, string memory chainName) internal view returns (address) {
        string memory json = vm.readFile(path);
        return vm.parseJsonAddress(json, string.concat(".", chainName));
    }

    function _readAddress(string memory path, string memory chainName, string memory field)
        internal
        view
        returns (address)
    {
        string memory json = vm.readFile(path);
        return vm.parseJsonAddress(json, string.concat(".", chainName, ".", field));
    }

    function _readPoolId(string memory path, string memory chainName, string memory field)
        internal
        view
        returns (bytes32)
    {
        string memory json = vm.readFile(path);
        return vm.parseJsonBytes32(json, string.concat(".", chainName, ".", field));
    }

    function _extractLastSwapFee(Vm.Log[] memory logs) internal pure returns (uint24 fee) {
        for (uint256 i = logs.length; i > 0; i--) {
            Vm.Log memory log = logs[i - 1];
            if (log.topics.length > 0 && log.topics[0] == SWAP_EVENT_SIG) {
                (,,,,, fee) = abi.decode(log.data, (int128, int128, uint160, uint128, int24, uint24));
                return fee;
            }
        }
        revert("VerifyHookBehavior: Swap event not found");
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
        revert("VerifyHookBehavior: FeeOverridden event not found");
    }

    function _validateSupportedChain(string memory chainName) internal pure {
        bytes32 chainHash = keccak256(bytes(chainName));
        bool isSupported = chainHash == keccak256(bytes("sepolia")) || chainHash == keccak256(bytes("base-sepolia"))
            || chainHash == keccak256(bytes("unichain-sepolia"));
        require(isSupported, "VerifyHookBehavior: unsupported CHAIN_NAME");
    }

    function _validateUtilization(uint256 utilization) internal pure {
        require(utilization <= 100, "VerifyHookBehavior: utilization out of range");
    }
}
