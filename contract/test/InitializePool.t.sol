// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {InitializePool} from "../script/InitializePool.s.sol";

contract MockPoolManagerForInitialize {
    bool public called;
    PoolKey public lastKey;
    uint160 public lastSqrtPriceX96;

    function initialize(PoolKey memory key, uint160 sqrtPriceX96) external returns (int24) {
        called = true;
        lastKey = key;
        lastSqrtPriceX96 = sqrtPriceX96;
        return 0;
    }
}

contract InitializePoolTest is Test {
    function test_initializePool_sortsTokenOrderAndInitializesDynamicFeePool() public {
        MockPoolManagerForInitialize poolManager = new MockPoolManagerForInitialize();
        InitializePool script = new InitializePool();

        address cpt = address(0x2000);
        address usdc = address(0x1000);
        address hook = address(0x3000);
        uint160 sqrtPriceX96 = 79228162514264337593543950336;

        script.initializePool(address(poolManager), cpt, usdc, hook, sqrtPriceX96);

        assertTrue(poolManager.called(), "initialize should be called");

        (Currency currency0, Currency currency1, uint24 fee, int24 tickSpacing, IHooks hooks) = poolManager.lastKey();
        assertEq(Currency.unwrap(currency0), usdc, "currency0 should be lower address");
        assertEq(Currency.unwrap(currency1), cpt, "currency1 should be higher address");
        assertEq(fee, LPFeeLibrary.DYNAMIC_FEE_FLAG, "fee should be dynamic fee flag");
        assertEq(tickSpacing, 60, "tick spacing should be 60");
        assertEq(address(hooks), hook, "hook should match");
        assertEq(poolManager.lastSqrtPriceX96(), sqrtPriceX96, "sqrtPriceX96 should match");
    }

    function test_recordDeployment_writesHookAndPoolId() public {
        InitializePool script = new InitializePool();
        string memory path = string.concat(vm.projectRoot(), "/tmp-deployed-addresses.json");
        string memory chainName = "base-sepolia";

        address cpt = address(0x1111);
        address oracle = address(0x2222);
        address hook = address(0x3333);
        bytes32 poolId = bytes32(uint256(0x1234));

        vm.writeFile(path, '{"base-sepolia":{"cpt":"0x0000000000000000000000000000000000001111","oracle":"0x0000000000000000000000000000000000002222"}}');

        script.recordDeployment(path, chainName, hook, poolId);

        string memory json = vm.readFile(path);
        assertEq(vm.parseJsonAddress(json, ".base-sepolia.cpt"), cpt, "cpt should be preserved");
        assertEq(vm.parseJsonAddress(json, ".base-sepolia.oracle"), oracle, "oracle should be preserved");
        assertEq(vm.parseJsonAddress(json, ".base-sepolia.hook"), hook, "hook should be written");
        assertEq(vm.parseJsonBytes32(json, ".base-sepolia.poolId"), poolId, "poolId should be written");
    }
}
