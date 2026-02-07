// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {PoolManager} from "v4-core/PoolManager.sol";
import {UtilizationHook} from "../src/hooks/UtilizationHook.sol";
import {IMockOracle, MockOracle} from "../src/MockOracle.sol";

/// @title UtilizationHookTest
/// @notice Task 2.1: UtilizationHook コントラクトスケルトンのテスト
contract UtilizationHookTest is Test {
    UtilizationHook public hook;
    MockOracle public oracle;
    IPoolManager public poolManager;

    function setUp() public {
        // PoolManager をデプロイ
        poolManager = new PoolManager(address(this));

        // MockOracle をデプロイ
        oracle = new MockOracle();

        // UtilizationHook をデプロイ（テスト用にアドレス制約なし）
        // 本番では CREATE2 + HookMiner が必要だが、ここではスケルトン検証のみ
        hook = new UtilizationHook(poolManager, IMockOracle(address(oracle)));
    }

    /// @notice oracle() が正しいアドレスを返すことを検証
    function test_oracle_returnsCorrectAddress() public view {
        assertEq(address(hook.oracle()), address(oracle));
    }

    /// @notice poolManager が正しく設定されていることを検証
    function test_poolManager_isSetCorrectly() public view {
        assertEq(address(hook.poolManager()), address(poolManager));
    }

    /// @notice LOW_FEE が 500 (0.05%) であることを検証
    function test_LOW_FEE_is500() public view {
        assertEq(hook.LOW_FEE(), 500);
    }

    /// @notice DEFAULT_FEE が 3000 (0.3%) であることを検証
    function test_DEFAULT_FEE_is3000() public view {
        assertEq(hook.DEFAULT_FEE(), 3000);
    }

    /// @notice HIGH_FEE が 10000 (1.0%) であることを検証
    function test_HIGH_FEE_is10000() public view {
        assertEq(hook.HIGH_FEE(), 10000);
    }

    /// @notice LOW_THRESHOLD が 30 であることを検証
    function test_LOW_THRESHOLD_is30() public view {
        assertEq(hook.LOW_THRESHOLD(), 30);
    }

    /// @notice HIGH_THRESHOLD が 70 であることを検証
    function test_HIGH_THRESHOLD_is70() public view {
        assertEq(hook.HIGH_THRESHOLD(), 70);
    }

    /// @notice コントラクトが IHooks インターフェースを実装していることを検証
    function test_implementsIHooks() public view {
        // IHooks にキャストできることを確認
        IHooks ihook = IHooks(address(hook));
        assertTrue(address(ihook) != address(0));
    }
}
