// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MockOracle} from "../src/MockOracle.sol";

contract MockOracleTest is Test {
    MockOracle private oracle;

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
        vm.expectRevert(bytes("MockOracle: utilization out of range"));
        oracle.setUtilization(101);
    }

    function test_SetUtilization_EmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit MockOracle.UtilizationUpdated(77);
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

        oracle.setUtilizationFromFunctions(55, block.timestamp, bytes32("req-1"));
        assertEq(oracle.getUtilization(), 55);
    }

    function test_NewAdminMethods_AreCallable() public {
        oracle.setStaleTtl(1200);
        oracle.setAuthorizedUpdater(address(this), true);
    }
}
