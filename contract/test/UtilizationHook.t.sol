// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {PoolManager} from "v4-core/PoolManager.sol";
import {UtilizationHook} from "../src/hooks/UtilizationHook.sol";
import {IMockOracle, MockOracle} from "../src/MockOracle.sol";

contract MetaOnlyOracle is IMockOracle {
    function getUtilization() external pure returns (uint256) {
        revert("legacy api disabled");
    }

    function setUtilization(uint256) external pure {}

    function getUtilizationWithMeta() external pure returns (uint256 utilization, uint256 updatedAt, bool stale, uint8 source) {
        return (10, 0, false, 1);
    }

    function setUtilizationFromBot(uint256, uint256) external pure {}

    function setUtilizationFromFunctions(uint256, uint256, bytes32) external pure {}

    function setStaleTtl(uint256) external pure {}

    function setAuthorizedUpdater(address, bool) external pure {}
}

contract StaleMetaOracle is IMockOracle {
    function getUtilization() external pure returns (uint256) {
        revert("legacy api disabled");
    }

    function setUtilization(uint256) external pure {}

    function getUtilizationWithMeta() external pure returns (uint256 utilization, uint256 updatedAt, bool stale, uint8 source) {
        return (10, 0, true, 1);
    }

    function setUtilizationFromBot(uint256, uint256) external pure {}

    function setUtilizationFromFunctions(uint256, uint256, bytes32) external pure {}

    function setStaleTtl(uint256) external pure {}

    function setAuthorizedUpdater(address, bool) external pure {}
}

contract ConfigurableMetaOracle is IMockOracle {
    uint256 private _utilization;
    bool private _stale;

    constructor(uint256 utilization_, bool stale_) {
        _utilization = utilization_;
        _stale = stale_;
    }

    function getUtilization() external pure returns (uint256) {
        revert("legacy api disabled");
    }

    function setUtilization(uint256) external pure {}

    function getUtilizationWithMeta() external view returns (uint256 utilization, uint256 updatedAt, bool stale, uint8 source) {
        return (_utilization, block.timestamp, _stale, 1);
    }

    function setUtilizationFromBot(uint256, uint256) external pure {}

    function setUtilizationFromFunctions(uint256, uint256, bytes32) external pure {}

    function setStaleTtl(uint256) external pure {}

    function setAuthorizedUpdater(address, bool) external pure {}
}

/// @title UtilizationHookTest
/// @notice Task 2.1: UtilizationHook コントラクトスケルトンのテスト
contract UtilizationHookTest is Test {
    using PoolIdLibrary for PoolKey;

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

    // ─── Task 2.2: getHookPermissions テスト ───

    /// @notice beforeSwap が true であることを検証
    function test_getHookPermissions_beforeSwapIsTrue() public view {
        Hooks.Permissions memory perms = hook.getHookPermissions();
        assertTrue(perms.beforeSwap, "beforeSwap should be true");
    }

    /// @notice beforeSwap 以外のすべてのフックが false であることを検証
    function test_getHookPermissions_allOtherPermissionsAreFalse() public view {
        Hooks.Permissions memory perms = hook.getHookPermissions();
        assertFalse(perms.beforeInitialize, "beforeInitialize should be false");
        assertFalse(perms.afterInitialize, "afterInitialize should be false");
        assertFalse(perms.beforeAddLiquidity, "beforeAddLiquidity should be false");
        assertFalse(perms.afterAddLiquidity, "afterAddLiquidity should be false");
        assertFalse(perms.beforeRemoveLiquidity, "beforeRemoveLiquidity should be false");
        assertFalse(perms.afterRemoveLiquidity, "afterRemoveLiquidity should be false");
        assertFalse(perms.afterSwap, "afterSwap should be false");
        assertFalse(perms.beforeDonate, "beforeDonate should be false");
        assertFalse(perms.afterDonate, "afterDonate should be false");
        assertFalse(perms.beforeSwapReturnDelta, "beforeSwapReturnDelta should be false");
        assertFalse(perms.afterSwapReturnDelta, "afterSwapReturnDelta should be false");
        assertFalse(perms.afterAddLiquidityReturnDelta, "afterAddLiquidityReturnDelta should be false");
        assertFalse(perms.afterRemoveLiquidityReturnDelta, "afterRemoveLiquidityReturnDelta should be false");
    }

    // ─── Task 2.3: calculateDynamicFee テスト ───

    /// @notice 稼働率 0 で LOW_FEE を返す（境界値: 最小）
    function test_calculateDynamicFee_utilization0_returnsLowFee() public view {
        assertEq(hook.calculateDynamicFee(0), 500);
    }

    /// @notice 稼働率 15 で LOW_FEE を返す（低稼働率の中間値）
    function test_calculateDynamicFee_utilization15_returnsLowFee() public view {
        assertEq(hook.calculateDynamicFee(15), 500);
    }

    /// @notice 稼働率 29 で LOW_FEE を返す（境界値: LOW_THRESHOLD - 1）
    function test_calculateDynamicFee_utilization29_returnsLowFee() public view {
        assertEq(hook.calculateDynamicFee(29), 500);
    }

    /// @notice 稼働率 30 で DEFAULT_FEE を返す（境界値: LOW_THRESHOLD）
    function test_calculateDynamicFee_utilization30_returnsDefaultFee() public view {
        assertEq(hook.calculateDynamicFee(30), 3000);
    }

    /// @notice 稼働率 50 で DEFAULT_FEE を返す（中稼働率の中間値）
    function test_calculateDynamicFee_utilization50_returnsDefaultFee() public view {
        assertEq(hook.calculateDynamicFee(50), 3000);
    }

    /// @notice 稼働率 69 で DEFAULT_FEE を返す（境界値: HIGH_THRESHOLD - 1）
    function test_calculateDynamicFee_utilization69_returnsDefaultFee() public view {
        assertEq(hook.calculateDynamicFee(69), 3000);
    }

    /// @notice 稼働率 70 で HIGH_FEE を返す（境界値: HIGH_THRESHOLD）
    function test_calculateDynamicFee_utilization70_returnsHighFee() public view {
        assertEq(hook.calculateDynamicFee(70), 10000);
    }

    /// @notice 稼働率 85 で HIGH_FEE を返す（高稼働率の中間値）
    function test_calculateDynamicFee_utilization85_returnsHighFee() public view {
        assertEq(hook.calculateDynamicFee(85), 10000);
    }

    /// @notice 稼働率 100 で HIGH_FEE を返す（境界値: 最大有効値）
    function test_calculateDynamicFee_utilization100_returnsHighFee() public view {
        assertEq(hook.calculateDynamicFee(100), 10000);
    }

    /// @notice 稼働率 101 で DEFAULT_FEE を返す（異常値フォールバック）
    function test_calculateDynamicFee_utilization101_returnsDefaultFee() public view {
        assertEq(hook.calculateDynamicFee(101), 3000);
    }

    /// @notice 稼働率 type(uint256).max で DEFAULT_FEE を返す（極端な異常値）
    function test_calculateDynamicFee_maxUint_returnsDefaultFee() public view {
        assertEq(hook.calculateDynamicFee(type(uint256).max), 3000);
    }

    // ─── Task 2.4: beforeSwap テスト ───

    /// @dev テスト用の PoolKey と SwapParams を生成するヘルパー
    function _makePoolKey() internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(1)),
            currency1: Currency.wrap(address(2)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
    }

    function _makeSwapParams() internal pure returns (IPoolManager.SwapParams memory) {
        return IPoolManager.SwapParams({zeroForOne: true, amountSpecified: 1e18, sqrtPriceLimitX96: 0});
    }

    function _makeModifyLiquidityParams() internal pure returns (IPoolManager.ModifyLiquidityParams memory) {
        return IPoolManager.ModifyLiquidityParams({tickLower: -120, tickUpper: 120, liquidityDelta: 1e18, salt: 0});
    }

    /// @notice beforeSwap が正しいセレクタを返すことを検証
    function test_beforeSwap_returnsCorrectSelector() public {
        oracle.setUtilization(50);
        PoolKey memory key = _makePoolKey();
        vm.prank(address(poolManager));
        (bytes4 selector,,) = hook.beforeSwap(address(this), key, _makeSwapParams(), "");
        assertEq(selector, IHooks.beforeSwap.selector);
    }

    /// @notice beforeSwap が ZERO_DELTA を返すことを検証
    function test_beforeSwap_returnsZeroDelta() public {
        oracle.setUtilization(50);
        PoolKey memory key = _makePoolKey();
        vm.prank(address(poolManager));
        (, BeforeSwapDelta delta,) = hook.beforeSwap(address(this), key, _makeSwapParams(), "");
        assertEq(BeforeSwapDelta.unwrap(delta), 0, "delta should be zero");
    }

    /// @notice 低稼働時に beforeSwap が LOW_FEE | OVERRIDE_FEE_FLAG を返すことを検証
    function test_beforeSwap_lowUtilization_returnsLowFeeWithOverride() public {
        oracle.setUtilization(10);
        PoolKey memory key = _makePoolKey();
        vm.prank(address(poolManager));
        (,, uint24 feeWithFlag) = hook.beforeSwap(address(this), key, _makeSwapParams(), "");
        assertEq(feeWithFlag, 500 | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    /// @notice 中稼働時に beforeSwap が DEFAULT_FEE | OVERRIDE_FEE_FLAG を返すことを検証
    function test_beforeSwap_midUtilization_returnsDefaultFeeWithOverride() public {
        oracle.setUtilization(50);
        PoolKey memory key = _makePoolKey();
        vm.prank(address(poolManager));
        (,, uint24 feeWithFlag) = hook.beforeSwap(address(this), key, _makeSwapParams(), "");
        assertEq(feeWithFlag, 3000 | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    /// @notice 高稼働時に beforeSwap が HIGH_FEE | OVERRIDE_FEE_FLAG を返すことを検証
    function test_beforeSwap_highUtilization_returnsHighFeeWithOverride() public {
        oracle.setUtilization(85);
        PoolKey memory key = _makePoolKey();
        vm.prank(address(poolManager));
        (,, uint24 feeWithFlag) = hook.beforeSwap(address(this), key, _makeSwapParams(), "");
        assertEq(feeWithFlag, 10000 | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    /// @notice beforeSwap が FeeOverridden イベントを発行することを検証
    function test_beforeSwap_emitsFeeOverriddenEvent() public {
        oracle.setUtilization(50);
        PoolKey memory key = _makePoolKey();
        PoolId poolId = key.toId();

        vm.expectEmit(true, false, false, true);
        emit UtilizationHook.FeeOverridden(poolId, 50, 3000);

        vm.prank(address(poolManager));
        hook.beforeSwap(address(this), key, _makeSwapParams(), "");
    }

    /// @notice 高稼働時の FeeOverridden イベントの稼働率と手数料が正しいことを検証
    function test_beforeSwap_highUtilization_emitsCorrectEvent() public {
        oracle.setUtilization(90);
        PoolKey memory key = _makePoolKey();
        PoolId poolId = key.toId();

        vm.expectEmit(true, false, false, true);
        emit UtilizationHook.FeeOverridden(poolId, 90, 10000);

        vm.prank(address(poolManager));
        hook.beforeSwap(address(this), key, _makeSwapParams(), "");
    }

    function test_beforeSwap_revertsWhenCallerIsNotPoolManager() public {
        oracle.setUtilization(50);
        PoolKey memory key = _makePoolKey();

        vm.expectRevert(abi.encodeWithSelector(UtilizationHook.UnauthorizedCaller.selector, address(this)));
        hook.beforeSwap(address(this), key, _makeSwapParams(), "");
    }

    function test_beforeSwap_usesMetaApiWhenLegacyGetterUnavailable() public {
        MetaOnlyOracle metaOracle = new MetaOnlyOracle();
        UtilizationHook metaHook = new UtilizationHook(poolManager, IMockOracle(address(metaOracle)));

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(1)),
            currency1: Currency.wrap(address(2)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(metaHook))
        });

        vm.prank(address(poolManager));
        (,, uint24 feeWithFlag) = metaHook.beforeSwap(address(this), key, _makeSwapParams(), "");
        assertEq(feeWithFlag, 500 | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    function test_beforeSwap_staleOracleForcesDefaultFee() public {
        StaleMetaOracle staleOracle = new StaleMetaOracle();
        UtilizationHook staleHook = new UtilizationHook(poolManager, IMockOracle(address(staleOracle)));

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(1)),
            currency1: Currency.wrap(address(2)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(staleHook))
        });

        vm.prank(address(poolManager));
        (,, uint24 feeWithFlag) = staleHook.beforeSwap(address(this), key, _makeSwapParams(), "");
        assertEq(feeWithFlag, 3000 | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    function test_beforeSwap_staleOracleEmitsStaleFallbackAppliedEvent() public {
        StaleMetaOracle staleOracle = new StaleMetaOracle();
        UtilizationHook staleHook = new UtilizationHook(poolManager, IMockOracle(address(staleOracle)));
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(1)),
            currency1: Currency.wrap(address(2)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(staleHook))
        });
        PoolId poolId = key.toId();

        vm.expectEmit(true, false, false, true);
        emit UtilizationHook.StaleFallbackApplied(poolId, 10, 1, 3000);

        vm.prank(address(poolManager));
        staleHook.beforeSwap(address(this), key, _makeSwapParams(), "");
    }

    function test_beforeSwap_nonStaleKeepsExistingDynamicFeeTiers() public {
        ConfigurableMetaOracle lowOracle = new ConfigurableMetaOracle(29, false);
        UtilizationHook lowHook = new UtilizationHook(poolManager, IMockOracle(address(lowOracle)));
        PoolKey memory lowKey = PoolKey({
            currency0: Currency.wrap(address(1)),
            currency1: Currency.wrap(address(2)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(lowHook))
        });

        ConfigurableMetaOracle midOracle = new ConfigurableMetaOracle(50, false);
        UtilizationHook midHook = new UtilizationHook(poolManager, IMockOracle(address(midOracle)));
        PoolKey memory midKey = PoolKey({
            currency0: Currency.wrap(address(1)),
            currency1: Currency.wrap(address(2)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(midHook))
        });

        ConfigurableMetaOracle highOracle = new ConfigurableMetaOracle(85, false);
        UtilizationHook highHook = new UtilizationHook(poolManager, IMockOracle(address(highOracle)));
        PoolKey memory highKey = PoolKey({
            currency0: Currency.wrap(address(1)),
            currency1: Currency.wrap(address(2)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(highHook))
        });

        vm.prank(address(poolManager));
        (,, uint24 lowFeeWithFlag) = lowHook.beforeSwap(address(this), lowKey, _makeSwapParams(), "");
        assertEq(lowFeeWithFlag, 500 | LPFeeLibrary.OVERRIDE_FEE_FLAG);

        vm.prank(address(poolManager));
        (,, uint24 midFeeWithFlag) = midHook.beforeSwap(address(this), midKey, _makeSwapParams(), "");
        assertEq(midFeeWithFlag, 3000 | LPFeeLibrary.OVERRIDE_FEE_FLAG);

        vm.prank(address(poolManager));
        (,, uint24 highFeeWithFlag) = highHook.beforeSwap(address(this), highKey, _makeSwapParams(), "");
        assertEq(highFeeWithFlag, 10000 | LPFeeLibrary.OVERRIDE_FEE_FLAG);
    }

    /// @notice 未使用フック（beforeInitialize）が未実装として revert することを検証
    function test_beforeInitialize_revertsNotImplemented() public {
        vm.expectRevert(bytes("not implemented"));
        hook.beforeInitialize(address(this), _makePoolKey(), 0);
    }

    /// @notice 未使用フック（afterInitialize）が未実装として revert することを検証
    function test_afterInitialize_revertsNotImplemented() public {
        vm.expectRevert(bytes("not implemented"));
        hook.afterInitialize(address(this), _makePoolKey(), 0, 0);
    }

    /// @notice 未使用フック（beforeAddLiquidity）が未実装として revert することを検証
    function test_beforeAddLiquidity_revertsNotImplemented() public {
        vm.expectRevert(bytes("not implemented"));
        hook.beforeAddLiquidity(address(this), _makePoolKey(), _makeModifyLiquidityParams(), "");
    }

    /// @notice 未使用フック（afterAddLiquidity）が未実装として revert することを検証
    function test_afterAddLiquidity_revertsNotImplemented() public {
        vm.expectRevert(bytes("not implemented"));
        hook.afterAddLiquidity(
            address(this),
            _makePoolKey(),
            _makeModifyLiquidityParams(),
            BalanceDelta.wrap(0),
            BalanceDelta.wrap(0),
            ""
        );
    }

    /// @notice 未使用フック（beforeRemoveLiquidity）が未実装として revert することを検証
    function test_beforeRemoveLiquidity_revertsNotImplemented() public {
        vm.expectRevert(bytes("not implemented"));
        hook.beforeRemoveLiquidity(address(this), _makePoolKey(), _makeModifyLiquidityParams(), "");
    }

    /// @notice 未使用フック（afterRemoveLiquidity）が未実装として revert することを検証
    function test_afterRemoveLiquidity_revertsNotImplemented() public {
        vm.expectRevert(bytes("not implemented"));
        hook.afterRemoveLiquidity(
            address(this),
            _makePoolKey(),
            _makeModifyLiquidityParams(),
            BalanceDelta.wrap(0),
            BalanceDelta.wrap(0),
            ""
        );
    }

    /// @notice 未使用フック（afterSwap）が未実装として revert することを検証
    function test_afterSwap_revertsNotImplemented() public {
        vm.expectRevert(bytes("not implemented"));
        hook.afterSwap(address(this), _makePoolKey(), _makeSwapParams(), BalanceDelta.wrap(0), "");
    }

    /// @notice 未使用フック（beforeDonate）が未実装として revert することを検証
    function test_beforeDonate_revertsNotImplemented() public {
        vm.expectRevert(bytes("not implemented"));
        hook.beforeDonate(address(this), _makePoolKey(), 1, 1, "");
    }

    /// @notice 未使用フック（afterDonate）が未実装として revert することを検証
    function test_afterDonate_revertsNotImplemented() public {
        vm.expectRevert(bytes("not implemented"));
        hook.afterDonate(address(this), _makePoolKey(), 1, 1, "");
    }
}
