// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {FunctionsConsumer} from "../contracts/FunctionsConsumer.sol";

contract FunctionsConsumerTest is Test {
    FunctionsConsumer public consumer;
    address public router = makeAddr("router");
    address public owner = makeAddr("owner");

    function setUp() public {
        vm.prank(owner);
        consumer = new FunctionsConsumer(router);
    }

    function test_Initialization() public {
        assertEq(consumer.owner(), owner);
    }

    // Checking that only owner can send request
    function test_RevertWhen_NotOwnerCallsSendRequest() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert();
        consumer.sendRequest("source", new string[](0), 1, 300000, bytes32("donId"));
    }
}
