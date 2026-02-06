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
}
