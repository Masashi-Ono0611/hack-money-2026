// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ComputeToken} from "../src/ComputeToken.sol";
import {OperatorVault} from "../src/OperatorVault.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SecurityTest is Test {
    address private owner = address(0xA11CE);
    address private user = address(0xB0B);

    function test_CPTMint_OnlyOwner() public {
        ComputeToken token = new ComputeToken("Compute Token", "CPT", owner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        token.mint(1);
    }

    function test_VaultWithdraw_OnlyOwner() public {
        MockUSDC usdc = new MockUSDC();
        OperatorVault vault = new OperatorVault(address(usdc), owner);

        uint256 amount = 1_000_000;
        usdc.mint(user, amount);

        vm.prank(user);
        usdc.approve(address(vault), amount);

        vm.prank(user);
        vault.depositUSDC(amount);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        vault.withdraw(1);
    }
}
