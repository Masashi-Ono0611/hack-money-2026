// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MockOracle} from "../src/MockOracle.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract MockOracleTest is Test {
    MockOracle private oracle;
    address private attacker = makeAddr("attacker");

    function setUp() public {
        oracle = new MockOracle();
    }

    function test_GetUtilization_DefaultIs50() public {
        assertEq(oracle.getUtilization(), 50);
    }

    function test_SetUtilization_WithinRange() public {
        oracle.setUtilization(0);
        assertEq(oracle.getUtilization(), 0);

        oracle.setUtilization(100);
        assertEq(oracle.getUtilization(), 100);
    }

    function test_SetUtilization_RevertsIfOutOfRange() public {
        vm.expectRevert(MockOracle.UtilizationOutOfRange.selector);
        oracle.setUtilization(101);
    }

    function test_SetUtilization_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit MockOracle.UtilizationUpdated(77, oracle.SOURCE_BOT(), block.timestamp);
        oracle.setUtilization(77);
    }

    function test_GetUtilizationWithMeta_ReturnsCurrentUtilization() public {
        oracle.setUtilization(66);
        (uint256 utilization,,,) = oracle.getUtilizationWithMeta();
        assertEq(utilization, 66);
    }

    function test_NewUpdateMethods_AreCallable() public {
        oracle.setUtilizationFromBot(45, block.timestamp);
        assertEq(oracle.getUtilization(), 45);

        oracle.setUtilizationFromFunctions(70, block.timestamp, bytes32("req-1"));
        assertEq(oracle.getUtilization(), 70);
    }

    function test_NewAdminMethods_AreCallable() public {
        oracle.setStaleTtl(1200);
        oracle.setAuthorizedUpdater(address(this), true);
    }

    function test_SetStaleTtl_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit MockOracle.TtlUpdated(777);
        oracle.setStaleTtl(777);
    }

    function test_SetAuthorizedUpdater_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit MockOracle.UpdaterAuthorizationChanged(address(this), true);
        oracle.setAuthorizedUpdater(address(this), true);
    }

    function test_Constants_AreDefinedWithExpectedValues() public view {
        assertEq(oracle.SOURCE_BOT(), 1);
        assertEq(oracle.SOURCE_FUNCTIONS(), 2);
        assertEq(oracle.DIVERGENCE_THRESHOLD(), 15);
        assertEq(oracle.DEFAULT_STALE_TTL(), 20 minutes);
    }

    function test_SourceMeta_UsesDefinedConstants() public {
        oracle.setUtilizationFromBot(60, block.timestamp);
        (,,, uint8 botSource) = oracle.getUtilizationWithMeta();
        assertEq(botSource, oracle.SOURCE_BOT());

        oracle.setUtilizationFromFunctions(40, block.timestamp, bytes32("req-2"));
        (,,, uint8 functionsSource) = oracle.getUtilizationWithMeta();
        assertEq(functionsSource, oracle.SOURCE_FUNCTIONS());
    }

    function test_SetUtilization_LegacyPathUpdatesSourceAndTimestamp() public {
        vm.warp(12345);
        oracle.setUtilization(88);

        (uint256 utilization, uint256 updatedAt,, uint8 source) = oracle.getUtilizationWithMeta();
        assertEq(utilization, 88);
        assertEq(updatedAt, 12345);
        assertEq(source, oracle.SOURCE_BOT());
    }

    function test_SetUtilizationFromFunctions_RecordsRequestId() public {
        bytes32 requestId = keccak256("functions-request");
        oracle.setUtilizationFromFunctions(70, block.timestamp, requestId);
        assertEq(oracle.lastFunctionsRequestId(), requestId);
    }

    function test_SetUtilizationFromBot_RevertsIfTimestampInFuture() public {
        uint256 futureDrift = oracle.MAX_TIMESTAMP_FUTURE_DRIFT();
        vm.expectRevert(MockOracle.TimestampInFuture.selector);
        oracle.setUtilizationFromBot(70, block.timestamp + futureDrift + 1);
    }

    function test_SetUtilizationFromFunctions_RevertsIfTimestampTooOld() public {
        uint256 maxAge = oracle.MAX_TIMESTAMP_AGE();
        vm.warp(maxAge + 100);
        vm.expectRevert(MockOracle.TimestampTooOld.selector);
        oracle.setUtilizationFromFunctions(70, block.timestamp - maxAge - 1, bytes32("req-old"));
    }

    function test_GetUtilizationWithMeta_InitialStateIsStale() public view {
        (,, bool stale,) = oracle.getUtilizationWithMeta();
        assertTrue(stale);
    }

    function test_GetUtilizationWithMeta_BecomesStaleAfterTtl() public {
        oracle.setUtilization(50);
        vm.warp(block.timestamp + oracle.DEFAULT_STALE_TTL() + 1);

        (,, bool stale,) = oracle.getUtilizationWithMeta();
        assertTrue(stale);
    }

    function test_SetUtilizationFromBot_RevertsIfTimestampAlreadyStaleAtWrite() public {
        uint256 staleTtl = oracle.DEFAULT_STALE_TTL();
        vm.warp(staleTtl + 100);
        vm.expectRevert(MockOracle.TimestampAlreadyStale.selector);
        oracle.setUtilizationFromBot(70, block.timestamp - staleTtl - 1);
    }

    function test_SetUtilizationFromFunctions_PrioritizesWhenDivergenceExceedsThreshold() public {
        oracle.setUtilizationFromBot(80, block.timestamp);
        oracle.setUtilizationFromFunctions(50, block.timestamp, bytes32("req-diverge"));

        (uint256 utilization,, , uint8 source) = oracle.getUtilizationWithMeta();
        assertEq(utilization, 50);
        assertEq(source, oracle.SOURCE_FUNCTIONS());
    }

    function test_SetUtilizationFromFunctions_DoesNotOverrideWhenWithinThreshold() public {
        oracle.setUtilizationFromBot(80, block.timestamp);
        oracle.setUtilizationFromFunctions(70, block.timestamp, bytes32("req-within"));

        (uint256 utilization,, , uint8 source) = oracle.getUtilizationWithMeta();
        assertEq(utilization, 80);
        assertEq(source, oracle.SOURCE_BOT());
    }

    function test_SetAuthorizedUpdater_RevertsForNonOwner() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker));
        oracle.setAuthorizedUpdater(attacker, true);
    }

    function test_SetUtilization_Legacy_RevertsForUnauthorizedUpdater() public {
        vm.prank(attacker);
        vm.expectRevert(MockOracle.UnauthorizedUpdater.selector);
        oracle.setUtilization(55);
    }

    function test_SetUtilizationFromBot_RevertsForUnauthorizedUpdater() public {
        vm.prank(attacker);
        vm.expectRevert(MockOracle.UnauthorizedUpdater.selector);
        oracle.setUtilizationFromBot(55, block.timestamp);
    }

    function test_SetUtilizationFromFunctions_RevertsForUnauthorizedUpdater() public {
        vm.prank(attacker);
        vm.expectRevert(MockOracle.UnauthorizedUpdater.selector);
        oracle.setUtilizationFromFunctions(55, block.timestamp, bytes32("req-unauth"));
    }

    function test_CustomErrorSelector_UtilizationOutOfRange() public {
        vm.expectRevert(MockOracle.UtilizationOutOfRange.selector);
        oracle.setUtilization(101);
    }

    function test_CustomErrorSelector_UnauthorizedUpdater() public {
        vm.prank(attacker);
        vm.expectRevert(MockOracle.UnauthorizedUpdater.selector);
        oracle.setUtilization(55);
    }
}
