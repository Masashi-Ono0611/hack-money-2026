// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ComputeToken} from "../src/ComputeToken.sol";

contract CPTTokenTest is Test {
    ComputeToken private token;

    address private owner = address(0xA11CE);
    address private user = address(0xB0B);
    address private spender = address(0xCAFE);

    function setUp() public {
        token = new ComputeToken("Compute Token", "CPT", owner);
    }

    function test_MintOnlyOwner() public {
        uint256 amount = 1_000e18;

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        token.mint(amount);

        vm.prank(owner);
        token.mint(amount);
        assertEq(token.totalSupply(), amount);
        assertEq(token.balanceOf(owner), amount);
    }

    function test_TransferAndBalance() public {
        uint256 amount = 500e18;

        vm.prank(owner);
        token.mint(amount);

        vm.prank(owner);
        token.transfer(user, 200e18);

        assertEq(token.balanceOf(owner), 300e18);
        assertEq(token.balanceOf(user), 200e18);
    }

    function test_ApproveAndTransferFrom() public {
        uint256 amount = 1_000e18;

        vm.prank(owner);
        token.mint(amount);

        vm.prank(owner);
        token.approve(spender, 400e18);

        vm.prank(spender);
        token.transferFrom(owner, user, 250e18);

        assertEq(token.balanceOf(owner), 750e18);
        assertEq(token.balanceOf(user), 250e18);
        assertEq(token.allowance(owner, spender), 150e18);
    }

    function test_TransferOwnership() public {
        address newOwner = address(0xD00D);

        vm.prank(owner);
        token.transferOwnership(newOwner);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, owner));
        vm.prank(owner);
        token.mint(1);

        vm.prank(newOwner);
        token.mint(2);
        assertEq(token.balanceOf(newOwner), 2);
    }
}
